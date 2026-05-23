import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import salesStatsService, { createEmptySalesStats } from '../services/salesStatsService';
import {
  calculateGainFromAmount,
  normalizeDateInput,
  normalizePercentageInput,
  SALES_STATS_CHART_METRICS,
  SALES_STATS_DEFAULT_CHART_METRIC,
  SALES_STATS_DEFAULT_PERCENTAGE,
  SALES_STATS_DEFAULT_PERIOD,
  SALES_STATS_DEFAULT_TIMEZONE,
  SALES_STATS_PERIODS,
  SALES_STATS_SCREEN_STATES,
  sortUsersByMetricDesc,
  toDateOnlyString,
  validateCustomRange,
} from '../utils/salesStats';

const buildCustomRangeState = (startDate = null, endDate = null) => ({
  startDate: normalizeDateInput(startDate),
  endDate: normalizeDateInput(endDate),
});

const shouldBlockOffline = ({ source, requireOnline }) => {
  if (typeof requireOnline === 'boolean') {
    return requireOnline;
  }

  return source === 'api';
};

export default function useSalesStats(options = {}) {
  const {
    source = 'mock',
    mockScenario = 'populated',
    autoLoad = true,
    requireOnline,
    timezone = SALES_STATS_DEFAULT_TIMEZONE,
    initialPeriod = SALES_STATS_DEFAULT_PERIOD,
    initialStartDate = null,
    initialEndDate = null,
    initialPercentage = SALES_STATS_DEFAULT_PERCENTAGE,
    initialChartMetric = SALES_STATS_DEFAULT_CHART_METRIC,
  } = options;

  const [period, setPeriod] = useState(initialPeriod);
  const [customRange, setCustomRange] = useState(() => buildCustomRangeState(initialStartDate, initialEndDate));
  const [percentage, setPercentage] = useState(normalizePercentageInput(initialPercentage));
  const [chartMetric, setChartMetric] = useState(initialChartMetric);
  const [screenState, setScreenState] = useState(
    autoLoad ? SALES_STATS_SCREEN_STATES.LOADING : SALES_STATS_SCREEN_STATES.EMPTY
  );
  const [stats, setStats] = useState(() => createEmptySalesStats({ source, period, timezone }));
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const [lastQuery, setLastQuery] = useState(null);

  const requestIdRef = useRef(0);
  const hasAutoLoadedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(Boolean(state.isConnected));
    });

    NetInfo.fetch().then((state) => {
      setIsConnected(Boolean(state.isConnected));
    });

    return unsubscribe;
  }, []);

  const customRangeValidation = useMemo(() => {
    if (period !== SALES_STATS_PERIODS.CUSTOM) {
      return {
        isValid: true,
        errorCode: null,
        message: '',
      };
    }

    return validateCustomRange(customRange);
  }, [customRange, period]);

  const hasInvalidCustomRange =
    period === SALES_STATS_PERIODS.CUSTOM && !customRangeValidation.isValid;

  const requestQuery = useMemo(() => {
    return {
      source,
      mockScenario,
      timezone,
      period,
      startDate: period === SALES_STATS_PERIODS.CUSTOM ? customRange.startDate : null,
      endDate: period === SALES_STATS_PERIODS.CUSTOM ? customRange.endDate : null,
      excludeCancelled: true,
    };
  }, [customRange.endDate, customRange.startDate, mockScenario, period, source, timezone]);

  const runFetch = useCallback(async ({ refresh = false, overrides = {} } = {}) => {
    const nextQuery = {
      ...requestQuery,
      ...overrides,
    };

    if (nextQuery.period === SALES_STATS_PERIODS.CUSTOM) {
      const validation = validateCustomRange({
        startDate: nextQuery.startDate,
        endDate: nextQuery.endDate,
      });

      if (!validation.isValid) {
        return {
          ok: false,
          reason: validation.errorCode,
        };
      }
    }

    const requireConnection = shouldBlockOffline({ source: nextQuery.source, requireOnline });

    if (requireConnection && !isConnected) {
      setError('Necesitás conexión para consultar estadísticas de ventas.');
      setScreenState(SALES_STATS_SCREEN_STATES.OFFLINE_BLOCKED);
      return {
        ok: false,
        reason: 'offline-blocked',
      };
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setError(null);
    setScreenState(refresh ? SALES_STATS_SCREEN_STATES.REFRESHING : SALES_STATS_SCREEN_STATES.LOADING);

    try {
      const response = await salesStatsService.getSalesStats(nextQuery);

      if (requestId !== requestIdRef.current) {
        return {
          ok: false,
          reason: 'stale-response',
        };
      }

      setStats(response);
      setLastQuery(nextQuery);
      setScreenState(
        response.users.length > 0 ? SALES_STATS_SCREEN_STATES.READY : SALES_STATS_SCREEN_STATES.EMPTY
      );

      return {
        ok: true,
        data: response,
      };
    } catch (requestError) {
      if (requestId === requestIdRef.current) {
        setError(requestError?.response?.data || requestError?.message || 'No se pudieron cargar las estadísticas.');
        setScreenState(SALES_STATS_SCREEN_STATES.ERROR);
      }

      return {
        ok: false,
        reason: 'request-failed',
        error: requestError,
      };
    }
  }, [isConnected, requestQuery, requireOnline]);

  useEffect(() => {
    if (!autoLoad || hasAutoLoadedRef.current) {
      return;
    }

    hasAutoLoadedRef.current = true;
    runFetch();
  }, [autoLoad, runFetch]);

  const usersWithDerivedGain = useMemo(() => {
    return stats.users.map((item) => ({
      ...item,
      calculatedGain: calculateGainFromAmount(item.totalAmount, percentage),
    }));
  }, [percentage, stats.users]);

  const summary = useMemo(() => {
    const calculatedGainTotal = usersWithDerivedGain.reduce(
      (accumulator, item) => accumulator + item.calculatedGain,
      0
    );

    return {
      ...stats.summary,
      calculatedGainTotal,
    };
  }, [stats.summary, usersWithDerivedGain]);

  const chartUsers = useMemo(() => {
    const usersWithMetric = usersWithDerivedGain.map((item) => ({
      ...item,
      [SALES_STATS_CHART_METRICS.CALCULATED_GAIN]: item.calculatedGain,
    }));

    return sortUsersByMetricDesc(usersWithMetric, chartMetric);
  }, [chartMetric, usersWithDerivedGain]);

  const chartData = useMemo(() => {
    return chartUsers.map((item) => ({
      value: item[chartMetric],
      label: item.userName,
      userId: item.userId,
      salesCount: item.salesCount,
      totalAmount: item.totalAmount,
      averageTicket: item.averageTicket,
      calculatedGain: item.calculatedGain,
    }));
  }, [chartMetric, chartUsers]);

  const setPeriodSelection = useCallback((nextPeriod) => {
    setPeriod(Object.values(SALES_STATS_PERIODS).includes(nextPeriod) ? nextPeriod : SALES_STATS_DEFAULT_PERIOD);
  }, []);

  const setCustomStartDate = useCallback((nextStartDate) => {
    setCustomRange((previousState) => ({
      ...previousState,
      startDate: normalizeDateInput(nextStartDate),
    }));
  }, []);

  const setCustomEndDate = useCallback((nextEndDate) => {
    setCustomRange((previousState) => ({
      ...previousState,
      endDate: normalizeDateInput(nextEndDate),
    }));
  }, []);

  const setCustomRangeDates = useCallback((nextStartDate, nextEndDate) => {
    setCustomRange(buildCustomRangeState(nextStartDate, nextEndDate));
  }, []);

  const setPercentageValue = useCallback((nextPercentage) => {
    setPercentage(normalizePercentageInput(nextPercentage));
  }, []);

  const setChartMetricSelection = useCallback((nextMetric) => {
    setChartMetric(
      Object.values(SALES_STATS_CHART_METRICS).includes(nextMetric)
        ? nextMetric
        : SALES_STATS_DEFAULT_CHART_METRIC
    );
  }, []);

  const applyFilters = useCallback((overrides = {}) => {
    if (hasInvalidCustomRange) {
      return Promise.resolve({
        ok: false,
        reason: customRangeValidation.errorCode,
      });
    }

    return runFetch({
      refresh: false,
      overrides,
    });
  }, [customRangeValidation.errorCode, hasInvalidCustomRange, runFetch]);

  const refresh = useCallback(() => {
    if (hasInvalidCustomRange) {
      return Promise.resolve({
        ok: false,
        reason: customRangeValidation.errorCode,
      });
    }

    return runFetch({
      refresh: true,
      overrides: lastQuery || {},
    });
  }, [customRangeValidation.errorCode, hasInvalidCustomRange, lastQuery, runFetch]);

  return {
    period,
    setPeriod: setPeriodSelection,
    customRange,
    setCustomStartDate,
    setCustomEndDate,
    setCustomRange: setCustomRangeDates,
    customRangeValidation,
    percentage,
    setPercentage: setPercentageValue,
    chartMetric,
    setChartMetric: setChartMetricSelection,
    screenState,
    error,
    isConnected,
    stats,
    summary,
    users: chartUsers,
    chartData,
    meta: stats.meta,
    requestQuery: {
      ...requestQuery,
      startDate: toDateOnlyString(requestQuery.startDate),
      endDate: toDateOnlyString(requestQuery.endDate),
    },
    lastQuery,
    hasInvalidCustomRange,
    applyFilters,
    refresh,
    isLoading: screenState === SALES_STATS_SCREEN_STATES.LOADING,
    isRefreshing: screenState === SALES_STATS_SCREEN_STATES.REFRESHING,
    isReady: screenState === SALES_STATS_SCREEN_STATES.READY,
    isEmpty: screenState === SALES_STATS_SCREEN_STATES.EMPTY,
    isError: screenState === SALES_STATS_SCREEN_STATES.ERROR,
    isOfflineBlocked: screenState === SALES_STATS_SCREEN_STATES.OFFLINE_BLOCKED,
  };
}
