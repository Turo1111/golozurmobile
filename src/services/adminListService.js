import apiClient from '../utils/client';

const DEFAULT_LIMIT = 15;
const SUPPORTED_ENTITIES = new Set(['client', 'user', 'role']);

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeEntity = (entity) => {
  const normalizedEntity = String(entity || '').trim().toLowerCase();

  if (!SUPPORTED_ENTITIES.has(normalizedEntity)) {
    throw new Error(`Entidad administrativa no soportada: ${entity}`);
  }

  return normalizedEntity;
};

const getArrayPayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.array)) {
    return payload.array;
  }

  if (payload?.data) {
    return getArrayPayload(payload.data);
  }

  return [];
};

const getTotalPayload = (payload, fallback) => {
  if (typeof payload?.total === 'number') {
    return payload.total;
  }

  if (typeof payload?.longitud === 'number') {
    return payload.longitud;
  }

  if (payload?.data) {
    return getTotalPayload(payload.data, fallback);
  }

  return fallback;
};

const getHasMorePayload = (payload) => {
  if (typeof payload?.hasMore === 'boolean') {
    return payload.hasMore;
  }

  if (payload?.data) {
    return getHasMorePayload(payload.data);
  }

  return null;
};

export const dedupeAdminItemsById = (items = []) => {
  const seenIds = new Set();

  return items.filter((item) => {
    if (!item) {
      return false;
    }

    const key = item._id || item.id || JSON.stringify(item);

    if (seenIds.has(key)) {
      return false;
    }

    seenIds.add(key);
    return true;
  });
};

export const normalizeAdminListQuery = (query = {}) => {
  const limit = Math.max(1, toSafeNumber(query.limit, DEFAULT_LIMIT));
  const offset = Math.max(0, toSafeNumber(query.offset ?? query.skip, 0));

  return {
    entity: normalizeEntity(query.entity),
    offset,
    limit,
    search: String(query.search || '').trim(),
  };
};

export const buildAdminListQueryKey = (query = {}) => {
  const normalizedQuery = normalizeAdminListQuery(query);

  return JSON.stringify({
    entity: normalizedQuery.entity,
    limit: normalizedQuery.limit,
    search: normalizedQuery.search,
  });
};

export const normalizeAdminListResponse = (payload = {}, query = normalizeAdminListQuery({ entity: 'user' })) => {
  const items = dedupeAdminItemsById(getArrayPayload(payload));
  const total = toSafeNumber(getTotalPayload(payload, items.length), items.length);
  const explicitHasMore = getHasMorePayload(payload);
  const hasMore = typeof explicitHasMore === 'boolean'
    ? explicitHasMore
    : query.offset + items.length < total;

  return {
    items,
    total,
    hasMore,
    nextOffset: query.offset + items.length,
  };
};

const listAdminEntitiesFromSkip = async (query) => {
  const response = await apiClient.post(`/${query.entity}/skip`, {
    skip: query.offset,
    limit: query.limit,
  });

  const normalizedResponse = normalizeAdminListResponse(response?.data, query);
  const explicitHasMore = getHasMorePayload(response?.data);
  const payloadTotal = getTotalPayload(response?.data, null);

  return {
    ...normalizedResponse,
    total: typeof payloadTotal === 'number' ? payloadTotal : normalizedResponse.total,
    hasMore: typeof explicitHasMore === 'boolean'
      ? explicitHasMore
      : typeof payloadTotal === 'number'
        ? query.offset + normalizedResponse.items.length < payloadTotal
        : normalizedResponse.items.length >= query.limit,
  };
};

const listAdminEntitiesFromSearch = async (query) => {
  const response = await apiClient.post(`/${query.entity}/search`, {
    input: query.search,
  });

  const normalizedItems = dedupeAdminItemsById(getArrayPayload(response?.data));
  const paginatedItems = normalizedItems.slice(query.offset, query.offset + query.limit);

  return {
    items: paginatedItems,
    total: normalizedItems.length,
    hasMore: query.offset + paginatedItems.length < normalizedItems.length,
    nextOffset: query.offset + paginatedItems.length,
  };
};

export const listAdminEntities = async (rawQuery = {}) => {
  const query = normalizeAdminListQuery(rawQuery);

  if (!query.search) {
    return listAdminEntitiesFromSkip(query);
  }

  return listAdminEntitiesFromSearch(query);
};

export default listAdminEntities;
