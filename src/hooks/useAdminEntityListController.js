import { useCallback, useEffect, useRef, useState } from 'react';
import listAdminEntities, {
  buildAdminListQueryKey,
  dedupeAdminItemsById,
  normalizeAdminListQuery,
} from '../services/adminListService';

const createInitialState = (query) => ({
  items: [],
  total: 0,
  hasMore: true,
  status: 'idle',
  error: null,
  queryKey: buildAdminListQueryKey(query),
});

const mergeAdminItemsById = (currentItems = [], incomingItems = []) => {
  return dedupeAdminItemsById([...currentItems, ...incomingItems]);
};

const getDefaultErrorMessage = (entity) => {
  switch (entity) {
    case 'client':
      return 'No se pudo cargar la lista de clientes';
    case 'role':
      return 'No se pudo cargar la lista de roles';
    default:
      return 'No se pudo cargar la lista de usuarios';
  }
};

export default function useAdminEntityListController(initialQuery = {}) {
  const initialNormalizedQuery = normalizeAdminListQuery(initialQuery);
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
      rollbackQueryOnError = false,
    } = options;

    const previousQuery = queryRef.current;
    const previousQueryKey = buildAdminListQueryKey(previousQuery);
    const normalizedQuery = normalizeAdminListQuery(nextQuery);
    const queryKey = buildAdminListQueryKey(normalizedQuery);
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
      const response = await listAdminEntities(normalizedQuery);
      const isLatestRequest = requestId === requestIdRef.current;
      const isSameActiveQuery = buildAdminListQueryKey(queryRef.current) === queryKey;

      if (!isLatestRequest || !isSameActiveQuery) {
        return {
          ignored: true,
          reason: 'stale-response',
        };
      }

      updateState((previousState) => {
        const nextItems = append
          ? mergeAdminItemsById(previousState.items, response.items)
          : dedupeAdminItemsById(response.items);

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
          error: error?.response?.data || error?.message || getDefaultErrorMessage(normalizedQuery.entity),
          queryKey: rollbackQueryOnError ? previousQueryKey : previousState.queryKey,
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

  const setSearch = useCallback((search) => {
    return runRequest(
      {
        ...queryRef.current,
        search,
        offset: 0,
      },
      {
        loadingStatus: 'initial-loading',
        clearItems: true,
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

  const retry = useCallback(() => {
    return runRequest(
      {
        ...queryRef.current,
        offset: 0,
      },
      {
        loadingStatus: 'initial-loading',
        clearItems: false,
      }
    );
  }, [runRequest]);

  const loadNextPage = useCallback(() => {
    const currentState = stateRef.current;

    if (currentState.status !== 'ready' || !currentState.hasMore) {
      return Promise.resolve({
        ignored: true,
        reason: 'pagination-guard',
      });
    }

    return runRequest(
      {
        ...queryRef.current,
        offset: queryRef.current.offset + queryRef.current.limit,
      },
      {
        append: true,
        loadingStatus: 'paginating',
        rollbackQueryOnError: true,
      }
    );
  }, [runRequest]);

  return {
    query,
    state,
    loadInitial,
    setSearch,
    loadNextPage,
    refresh,
    retry,
  };
}
