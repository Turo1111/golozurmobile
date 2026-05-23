import { useCallback, useEffect, useRef, useState } from 'react';
import listProducts, {
  buildProductQueryKey,
  dedupeProductsById,
  normalizeProductListQuery,
} from '../services/productListService';

const createInitialState = (query) => ({
  items: [],
  total: 0,
  hasMore: true,
  status: 'idle',
  error: null,
  pendingRealtimeCount: 0,
  queryKey: buildProductQueryKey(query),
});

const mergeProductsById = (currentItems = [], incomingItems = []) => {
  return dedupeProductsById([...currentItems, ...incomingItems]);
};

export default function useProductListController(initialQuery = {}) {
  const initialNormalizedQuery = normalizeProductListQuery(initialQuery);
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
    const normalizedQuery = normalizeProductListQuery(nextQuery);
    const queryKey = buildProductQueryKey(normalizedQuery);
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
      const response = await listProducts(normalizedQuery);

      const isLatestRequest = requestId === requestIdRef.current;
      const isSameActiveQuery = buildProductQueryKey(queryRef.current) === queryKey;

      if (!isLatestRequest || !isSameActiveQuery) {
        return {
          ignored: true,
          reason: 'stale-response',
        };
      }

      updateState((previousState) => {
        const nextItems = append
          ? mergeProductsById(previousState.items, response.items)
          : dedupeProductsById(response.items);

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
          error: error?.response?.data || error?.message || 'No se pudo cargar la lista de productos',
        }));
      }

      throw error;
    }
  }, [updateState]);

  const loadInitial = useCallback((overrides = {}) => {
    return runRequest(
      {
        ...queryRef.current,
        ...overrides,
        offset: 0,
      },
      {
        loadingStatus: 'initial-loading',
        clearItems: true,
      }
    );
  }, [runRequest]);

  const applyQueryChanges = useCallback((changes = {}, options = {}) => {
    return runRequest(
      {
        ...queryRef.current,
        ...changes,
        offset: 0,
      },
      {
        loadingStatus: options.loadingStatus || 'initial-loading',
        clearItems: options.clearItems !== false,
      }
    );
  }, [runRequest]);

  const refresh = useCallback(() => {
    return runRequest(
      {
        ...queryRef.current,
        offset: 0,
      },
      {
        loadingStatus: 'refreshing',
        clearItems: false,
      }
    );
  }, [runRequest]);

  const loadNextPage = useCallback(() => {
    const currentState = stateRef.current;
    const currentQuery = queryRef.current;

    if (currentQuery.mode !== 'server' || currentState.status !== 'ready' || !currentState.hasMore) {
      return Promise.resolve({
        ignored: true,
        reason: 'pagination-guard',
      });
    }

    return runRequest(
      {
        ...currentQuery,
        offset: currentQuery.offset + currentQuery.limit,
      },
      {
        append: true,
        loadingStatus: 'paginating',
        rollbackQueryOnError: true,
      }
    );
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
    applyQueryChanges,
    loadNextPage,
    refresh,
    consumeRealtime,
    incrementPendingRealtime,
  };
}
