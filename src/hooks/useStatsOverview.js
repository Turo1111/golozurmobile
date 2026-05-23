import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useRef, useState } from 'react';
import statsOverviewService, { createEmptyStatsOverview } from '../services/statsOverviewService';
import { SALES_STATS_SCREEN_STATES } from '../utils/salesStats';

export default function useStatsOverview(options = {}) {
  const {
    source = 'mock',
    mockScenario = 'populated',
    autoLoad = true,
    requireOnline = true,
  } = options;

  const [overview, setOverview] = useState(() => createEmptyStatsOverview({ source }));
  const [screenState, setScreenState] = useState(
    autoLoad ? SALES_STATS_SCREEN_STATES.LOADING : SALES_STATS_SCREEN_STATES.EMPTY
  );
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(() => (requireOnline ? null : true));
  const requestIdRef = useRef(0);
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

  const loadOverview = useCallback(async ({ refresh = false } = {}) => {
    if (requireOnline && !hasResolvedConnectivity) {
      return { ok: false, reason: 'connectivity-pending' };
    }

    if (requireOnline && !isConnected) {
      setError('Conectate a internet para consultar el resumen general.');
      setScreenState(SALES_STATS_SCREEN_STATES.OFFLINE_BLOCKED);
      return { ok: false, reason: 'offline-blocked' };
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setError(null);
    setScreenState(refresh ? SALES_STATS_SCREEN_STATES.REFRESHING : SALES_STATS_SCREEN_STATES.LOADING);

    try {
      const response = await statsOverviewService.getStatsOverview({
        source,
        mockScenario,
      });

      if (requestId !== requestIdRef.current) {
        return { ok: false, reason: 'stale-response' };
      }

      setOverview(response);
      setScreenState(SALES_STATS_SCREEN_STATES.READY);
      return { ok: true, data: response };
    } catch (requestError) {
      if (requestId === requestIdRef.current) {
        setError(requestError?.response?.data || requestError?.message || 'No se pudo cargar el resumen.');
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

    loadOverview();
  }, [autoLoad, hasResolvedConnectivity, loadOverview, requireOnline]);

  return {
    overview,
    summary: overview.summary,
    meta: overview.meta,
    screenState,
    error,
    isConnected,
    hasResolvedConnectivity,
    refresh: () => loadOverview({ refresh: true }),
    isLoading: screenState === SALES_STATS_SCREEN_STATES.LOADING,
    isRefreshing: screenState === SALES_STATS_SCREEN_STATES.REFRESHING,
    isReady: screenState === SALES_STATS_SCREEN_STATES.READY,
    isError: screenState === SALES_STATS_SCREEN_STATES.ERROR,
    isOfflineBlocked: screenState === SALES_STATS_SCREEN_STATES.OFFLINE_BLOCKED,
  };
}
