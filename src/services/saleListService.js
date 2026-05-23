import apiClient from '../utils/client';

const DEFAULT_LIMIT = 25;
const DEFAULT_SORT = 'createdAt:desc';

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

  return [];
};

export const dedupeSalesById = (items = []) => {
  const seenIds = new Set();

  return items.filter((item) => {
    if (!item) {
      return false;
    }

    const key = item._id || JSON.stringify(item);

    if (seenIds.has(key)) {
      return false;
    }

    seenIds.add(key);
    return true;
  });
};

const sortSalesByCreatedAtDesc = (items = []) => {
  return [...items].sort((left, right) => {
    const leftDate = new Date(left?.createdAt || 0).getTime();
    const rightDate = new Date(right?.createdAt || 0).getTime();

    return rightDate - leftDate;
  });
};

const matchesUserId = (sale, userId) => {
  if (!userId) {
    return true;
  }

  const candidateIds = [
    sale?.user,
    sale?.userId,
    sale?.idUser,
    sale?.user?._id,
    sale?.userCreate?._id,
  ].filter(Boolean);

  return candidateIds.some((candidate) => String(candidate) === String(userId));
};

const normalizeComparableText = (value) => {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
};

const matchesUserLabel = (sale, userLabel) => {
  const normalizedUserLabel = normalizeComparableText(userLabel);

  if (!normalizedUserLabel) {
    return true;
  }

  const candidateLabels = [
    sale?.userCreate,
    sale?.userName,
    sale?.nickname,
    sale?.user?.nickname,
    sale?.user?.name,
    sale?.userCreate?.nickname,
  ];

  return candidateLabels.some((candidate) => normalizeComparableText(candidate) === normalizedUserLabel);
};

const matchesUserFilter = (sale, query) => {
  if (!query.userId) {
    return true;
  }

  if (matchesUserId(sale, query.userId)) {
    return true;
  }

  return matchesUserLabel(sale, query.userLabel);
};

const normalizeBooleanHasMore = ({ total, offset, limit, itemsLength, explicitHasMore }) => {
  if (typeof explicitHasMore === 'boolean') {
    return explicitHasMore;
  }

  if (typeof total === 'number') {
    return offset + itemsLength < total;
  }

  return itemsLength >= limit;
};

export const normalizeSalesListQuery = (query = {}) => {
  const normalizedLimit = Math.max(1, toSafeNumber(query.limit, DEFAULT_LIMIT));
  const normalizedOffset = Math.max(0, toSafeNumber(query.offset ?? query.skip, 0));

  return {
    mode: 'server',
    offset: normalizedOffset,
    limit: normalizedLimit,
    search: String(query.search || '').trim(),
    userId: query.userId || query.filterUser || null,
    userLabel: String(query.userLabel || query.userName || '').trim(),
    sort: query.sort || DEFAULT_SORT,
  };
};

export const normalizeSalesListResponse = (payload = {}, query = normalizeSalesListQuery()) => {
  const items = dedupeSalesById(getArrayPayload(payload));
  const total = toSafeNumber(payload.total ?? payload.longitud, items.length);
  const hasMore = normalizeBooleanHasMore({
    total,
    offset: query.offset,
    limit: query.limit,
    itemsLength: items.length,
    explicitHasMore: payload.hasMore,
  });

  return {
    items,
    total,
    hasMore,
    nextOffset: query.offset + items.length,
  };
};

const listSalesFromSkip = async (query) => {
  const response = await apiClient.post('/sale/skip', {
    skip: query.offset,
    limit: query.limit,
    filterUser: query.userId,
  });

  return normalizeSalesListResponse(response?.data, query);
};

const listSalesFromSearch = async (query) => {
  const response = await apiClient.post('/sale/search', {
    input: query.search,
    filterUser: query.userId,
  });

  const searchedItems = sortSalesByCreatedAtDesc(
    dedupeSalesById(getArrayPayload(response?.data)).filter((sale) => matchesUserFilter(sale, query))
  );

  const paginatedItems = searchedItems.slice(query.offset, query.offset + query.limit);

  return normalizeSalesListResponse(
    {
      items: paginatedItems,
      total: searchedItems.length,
      hasMore: query.offset + paginatedItems.length < searchedItems.length,
    },
    query
  );
};

export const listSales = async (rawQuery = {}) => {
  const query = normalizeSalesListQuery(rawQuery);

  if (query.search) {
    return listSalesFromSearch(query);
  }

  return listSalesFromSkip(query);
};

export default listSales;
