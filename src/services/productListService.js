import apiClient from '../utils/client';

const DEFAULT_LIMIT = 15;
const ALL_SENTINEL = 1;

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

  if (Array.isArray(payload?.product)) {
    return payload.product;
  }

  return [];
};

const normalizeFilterId = (value) => {
  if (value === null || value === undefined || value === '' || Number(value) === ALL_SENTINEL) {
    return null;
  }

  return value;
};

const toLegacyFilterValue = (value) => {
  return normalizeFilterId(value) ?? ALL_SENTINEL;
};

const hasActiveServerFilters = (query = {}) => {
  return Boolean(
    String(query.search || '').trim()
    || normalizeFilterId(query.categoryId)
    || normalizeFilterId(query.brandId)
    || normalizeFilterId(query.providerId)
  );
};

export const dedupeProductsById = (items = []) => {
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

export const normalizeProductListQuery = (query = {}) => {
  const normalizedLimit = Math.max(1, toSafeNumber(query.limit, DEFAULT_LIMIT));
  const normalizedOffset = Math.max(0, toSafeNumber(query.offset ?? query.skip, 0));

  return {
    mode: query.mode === 'local' ? 'local' : 'server',
    offset: normalizedOffset,
    limit: normalizedLimit,
    search: String(query.search || '').trim(),
    categoryId: normalizeFilterId(query.categoryId ?? query.categoria),
    brandId: normalizeFilterId(query.brandId ?? query.marca),
    providerId: normalizeFilterId(query.providerId ?? query.proveedor),
  };
};

export const buildProductQueryKey = (query = {}) => {
  const normalized = normalizeProductListQuery(query);

  return JSON.stringify({
    mode: normalized.mode,
    limit: normalized.limit,
    search: normalized.search,
    categoryId: normalized.categoryId,
    brandId: normalized.brandId,
    providerId: normalized.providerId,
  });
};

export const normalizeProductListResponse = (payload = {}, query = normalizeProductListQuery()) => {
  const items = dedupeProductsById(getArrayPayload(payload));
  const total = toSafeNumber(payload.total ?? payload.longitud, items.length);
  const hasMore = typeof payload.hasMore === 'boolean'
    ? payload.hasMore
    : query.offset + items.length < total;

  return {
    items,
    total,
    hasMore,
    nextOffset: query.offset + items.length,
  };
};

const listProductsFromSkip = async (query) => {
  const response = await apiClient.post('/product/skip', {
    skip: query.offset,
    limit: query.limit,
  });

  const items = dedupeProductsById(getArrayPayload(response?.data));

  return normalizeProductListResponse(
    {
      items,
      total: response?.data?.total ?? response?.data?.longitud ?? items.length,
      hasMore: typeof response?.data?.hasMore === 'boolean'
        ? response.data.hasMore
        : items.length >= query.limit,
    },
    query
  );
};

const listProductsFromSearch = async (query) => {
  const response = await apiClient.post('/product/search', {
    input: query.search,
    categoria: toLegacyFilterValue(query.categoryId),
    marca: toLegacyFilterValue(query.brandId),
    proveedor: toLegacyFilterValue(query.providerId),
  });

  const normalizedItems = dedupeProductsById(getArrayPayload(response?.data));
  const paginatedItems = normalizedItems.slice(query.offset, query.offset + query.limit);

  return normalizeProductListResponse(
    {
      items: paginatedItems,
      total: normalizedItems.length,
      hasMore: query.offset + paginatedItems.length < normalizedItems.length,
    },
    query
  );
};

export const list = async (rawQuery = {}) => {
  const query = normalizeProductListQuery(rawQuery);

  if (query.mode === 'local') {
    return normalizeProductListResponse({ items: [] }, query);
  }

  if (hasActiveServerFilters(query)) {
    return listProductsFromSearch(query);
  }

  return listProductsFromSkip(query);
};

export default list;
