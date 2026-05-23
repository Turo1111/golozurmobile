import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useRef, useState } from 'react';
import userStatsService, { createEmptyUserStats } from '../services/userStatsService';
import {
  SALES_STATS_DEFAULT_PERIOD,
  SALES_STATS_DEFAULT_TIMEZONE,
  SALES_STATS_SCREEN_STATES,
} from '../utils/salesStats';

export default function useUserStats(options = {}) {
  const {
    source = 'mock',
    mockScenario = 'populated',
    autoLoad = true,
    requireOnline = true,
    initialPeriod = SALES_STATS_DEFAULT_PERIOD,
  } = options;

  const initialFilters = {
    period: initialPeriod,
    from: null,
    to: null,
    timezone: SALES_STATS_DEFAULT_TIMEZONE,
  };

  const [period, setPeriod] = useState(initialPeriod);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [data, setData] = useState(() => createEmptyUserStats({ source, period: initialPeriod }));
  const [screenState, setScreenState] = useState(
    autoLoad ? SALES_STATS_SCREEN_STATES.LOADING : SALES_STATS_SCREEN_STATES.EMPTY
  );
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(() => (requireOnline ? null : true));
  const requestIdRef = useRef(0);
  const appliedFiltersRef = useRef(initialFilters);
  const hasResolvedConnectivity = isConnected !== null;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(Boolean(state.isConnected));
    });

    NetInfo.fetch().then((state) => {
      setIsConnected(Boolean(state.isConnected));
    });

    return unsubscribe;
  }, []);

  const loadUsers = useCallback(async ({ refresh = false, overrides = {} } = {}) => {
    if (requireOnline && !hasResolvedConnectivity) {
      return { ok: false, reason: 'connectivity-pending' };
    }

    if (requireOnline && !isConnected) {
      setError('Conectate a internet para consultar estadísticas por usuario.');
      setScreenState(SALES_STATS_SCREEN_STATES.OFFLINE_BLOCKED);
      return { ok: false, reason: 'offline-blocked' };
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const nextFilters = {
      ...appliedFiltersRef.current,
      ...overrides,
    };

    appliedFiltersRef.current = nextFilters;
    setAppliedFilters(nextFilters);
    setPeriod(nextFilters.period || SALES_STATS_DEFAULT_PERIOD);
    setError(null);
    setScreenState(refresh ? SALES_STATS_SCREEN_STATES.REFRESHING : SALES_STATS_SCREEN_STATES.LOADING);

    try {
      const response = await userStatsService.getUserStats({
        source,
        mockScenario,
        ...nextFilters,
      });

      if (requestId !== requestIdRef.current) {
        return { ok: false, reason: 'stale-response' };
      }

      setData(response);
      setScreenState(response.users.length > 0 ? SALES_STATS_SCREEN_STATES.READY : SALES_STATS_SCREEN_STATES.EMPTY);
      return { ok: true, data: response };
    } catch (requestError) {
      if (requestId === requestIdRef.current) {
        setError(requestError?.response?.data || requestError?.message || 'No se pudo cargar el módulo de usuarios.');
        setScreenState(SALES_STATS_SCREEN_STATES.ERROR);
      }

      return { ok: false, reason: 'request-failed', error: requestError };
    }
  }, [hasResolvedConnectivity, isConnected, mockScenario, requireOnline, source]);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    if (requireOnline && !hasResolvedConnectivity) {
      return;
    }

    loadUsers();
  }, [autoLoad, hasResolvedConnectivity, loadUsers, requireOnline]);

  return {
    period,
    setPeriod,
    appliedFilters,
    users: data.users,
    summary: data.summary,
    meta: data.meta,
    screenState,
    error,
    isConnected,
    hasResolvedConnectivity,
    refresh: () => loadUsers({ refresh: true }),
    reload: loadUsers,
    isLoading: screenState === SALES_STATS_SCREEN_STATES.LOADING,
    isRefreshing: screenState === SALES_STATS_SCREEN_STATES.REFRESHING,
    isReady: screenState === SALES_STATS_SCREEN_STATES.READY,
    isEmpty: screenState === SALES_STATS_SCREEN_STATES.EMPTY,
    isError: screenState === SALES_STATS_SCREEN_STATES.ERROR,
    isOfflineBlocked: screenState === SALES_STATS_SCREEN_STATES.OFFLINE_BLOCKED,
  };
}
