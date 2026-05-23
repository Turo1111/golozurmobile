import { useCallback, useEffect, useRef, useState } from 'react';
import listSales, {
  dedupeSalesById,
  normalizeSalesListQuery,
} from '../services/saleListService';

export const buildSalesQueryKey = (query = {}) => {
  const normalized = normalizeSalesListQuery(query);

  return JSON.stringify({
    mode: normalized.mode,
    limit: normalized.limit,
    search: normalized.search,
    userId: normalized.userId,
    userLabel: normalized.userLabel,
    sort: normalized.sort,
  });
};

const createInitialState = (query) => ({
  items: [],
  total: 0,
  hasMore: true,
  status: 'idle',
  error: null,
  pendingRealtimeCount: 0,
  queryKey: buildSalesQueryKey(query),
});

const mergeSalesById = (currentItems = [], incomingItems = []) => {
  return dedupeSalesById([...currentItems, ...incomingItems]);
};

export default function useSalesListController(initialQuery = {}) {
  const initialNormalizedQuery = normalizeSalesListQuery(initialQuery);
  const [query, setQuery] = useState(initialNormalizedQuery);
  const [state, setState] = useState(() => createInitialState(initialNormalizedQuery));

  const queryRef = useRef(initialNormalizedQuery);
  const stateRef = useRef(createInitialState(initialNormalizedQuery));
  const requestIdRef = useRef(0);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const updateState = useCallback((updater) => {
    setState((previousState) => {
      const nextState = typeof updater === 'function' ? updater(previousState) : updater;
      stateRef.current = nextState;
      return nextState;
    });
  }, []);

  const runRequest = useCallback(async (nextQuery, options = {}) => {
    const {
      append = false,
      loadingStatus = 'initial-loading',
      clearItems = false,
      clearRealtimeOnSuccess = false,
      rollbackQueryOnError = false,
    } = options;

    const previousQuery = queryRef.current;
    const normalizedQuery = normalizeSalesListQuery(nextQuery);
    const queryKey = buildSalesQueryKey(normalizedQuery);
    const requestId = requestIdRef.current + 1;

    requestIdRef.current = requestId;
    queryRef.current = normalizedQuery;
    setQuery(normalizedQuery);

    updateState((previousState) => ({
      ...previousState,
      items: clearItems ? [] : previousState.items,
      status: loadingStatus,
      error: null,
      queryKey,
    }));

    try {
      const response = await listSales(normalizedQuery);

      const isLatestRequest = requestId === requestIdRef.current;
      const isSameActiveQuery = buildSalesQueryKey(queryRef.current) === queryKey;

      if (!isLatestRequest || !isSameActiveQuery) {
        return {
          ignored: true,
          reason: 'stale-response',
        };
      }

      updateState((previousState) => {
        const nextItems = append
          ? mergeSalesById(previousState.items, response.items)
          : dedupeSalesById(response.items);

        return {
          ...previousState,
          items: nextItems,
          total: typeof response.total === 'number' ? response.total : nextItems.length,
          hasMore: typeof response.hasMore === 'boolean'
            ? response.hasMore
            : response.nextOffset < (response.total || nextItems.length),
          status: 'ready',
          error: null,
          queryKey,
          pendingRealtimeCount: clearRealtimeOnSuccess ? 0 : previousState.pendingRealtimeCount,
        };
      });

      return {
        ignored: false,
        data: response,
      };
    } catch (error) {
      const isLatestRequest = requestId === requestIdRef.current;

      if (rollbackQueryOnError && isLatestRequest) {
        queryRef.current = previousQuery;
        setQuery(previousQuery);
      }

      if (isLatestRequest) {
        updateState((previousState) => ({
          ...previousState,
          status: 'error',
          error: error?.response?.data || error?.message || 'No se pudo cargar la lista de ventas',
        }));
      }

      throw error;
    }
  }, [updateState]);

  const loadInitial = useCallback((overrides = {}) => {
    const nextQuery = {
      ...queryRef.current,
      ...overrides,
      offset: 0,
    };

    return runRequest(nextQuery, {
      loadingStatus: 'initial-loading',
      clearItems: true,
    });
  }, [runRequest]);

  const setSearch = useCallback((search, overrides = {}) => {
    const nextQuery = {
      ...queryRef.current,
      ...overrides,
      search,
      offset: 0,
    };

    return runRequest(nextQuery, {
      loadingStatus: 'initial-loading',
      clearItems: true,
    });
  }, [runRequest]);

  const setUser = useCallback((userId, overrides = {}) => {
    const nextQuery = {
      ...queryRef.current,
      ...overrides,
      userId,
      offset: 0,
    };

    return runRequest(nextQuery, {
      loadingStatus: 'initial-loading',
      clearItems: true,
    });
  }, [runRequest]);

  const refresh = useCallback(() => {
    const nextQuery = {
      ...queryRef.current,
      offset: 0,
    };

    return runRequest(nextQuery, {
      loadingStatus: 'refreshing',
      clearItems: false,
    });
  }, [runRequest]);

  const loadNextPage = useCallback(() => {
    const currentState = stateRef.current;

    if (currentState.status !== 'ready' || !currentState.hasMore) {
      return Promise.resolve({
        ignored: true,
        reason: 'pagination-guard',
      });
    }

    const nextQuery = {
      ...queryRef.current,
      offset: queryRef.current.offset + queryRef.current.limit,
    };

    return runRequest(nextQuery, {
      append: true,
      loadingStatus: 'paginating',
      rollbackQueryOnError: true,
    });
  }, [runRequest]);

  const incrementPendingRealtime = useCallback((count = 1) => {
    const safeCount = Number.isFinite(Number(count)) ? Number(count) : 1;

    updateState((previousState) => ({
      ...previousState,
      pendingRealtimeCount: previousState.pendingRealtimeCount + Math.max(1, safeCount),
    }));
  }, [updateState]);

  const consumeRealtime = useCallback(() => {
    return runRequest(
      {
        ...queryRef.current,
        offset: 0,
      },
      {
        loadingStatus: 'refreshing',
        clearItems: false,
        clearRealtimeOnSuccess: true,
      }
    );
  }, [runRequest]);

  return {
    query,
    state,
    loadInitial,
    setSearch,
    setUser,
    loadNextPage,
    refresh,
    consumeRealtime,
    incrementPendingRealtime,
  };
}
