import apiClient from '../utils/client';
import { getSalesStatsMockFixture } from '../mocks/salesStatsMock';
import {
  SALES_STATS_DEFAULT_PERIOD,
  SALES_STATS_DEFAULT_TIMEZONE,
  SALES_STATS_PERIODS,
  roundToTwoDecimals,
  sortUsersByMetricDesc,
  toDateOnlyString,
  toSafeNumber,
} from '../utils/salesStats';

const SALES_STATS_API_PATH = '/sale/stats/by-user';
const SALES_STATS_OVERVIEW_API_PATH = '/sale/stats/overview';

const getArrayPayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.users)) {
    return payload.users;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
};

const normalizeUserId = (item = {}) => {
  return item.userId || item.user?._id || item.user?._idUser || item._id || item.idUser || '';
};

const normalizeUserName = (item = {}) => {
  return item.userName || item.user?.nickname || item.user?.name || item.nickname || item.name || 'Sin nombre';
};

const normalizeStatsUser = (item = {}) => {
  const salesCount = toSafeNumber(item.salesCount ?? item.totalSales ?? item.quantitySales ?? item.count);
  const totalAmount = roundToTwoDecimals(item.totalAmount ?? item.totalSold ?? item.total ?? item.amount);
  const averageTicket = salesCount > 0
    ? roundToTwoDecimals(item.averageTicket ?? item.avgTicket ?? totalAmount / salesCount)
    : 0;

  return {
    userId: normalizeUserId(item),
    userName: normalizeUserName(item),
    roleName: item.roleName || item.user?.role?.name || item.user?.nameRole || item.nameRole || null,
    salesCount,
    totalAmount,
    averageTicket,
  };
};

export const createEmptySalesStats = (meta = {}) => ({
  summary: {
    totalSalesCount: 0,
    totalAmount: 0,
    activeSellersCount: 0,
    averageTicket: 0,
  },
  users: [],
  meta: {
    source: meta.source || 'mock',
    isMockData: meta.isMockData ?? meta.source !== 'api',
    period: meta.period || SALES_STATS_DEFAULT_PERIOD,
    timezone: meta.timezone || SALES_STATS_DEFAULT_TIMEZONE,
    effectiveRange: meta.effectiveRange || {
      startDate: null,
      endDate: null,
    },
    includeCancelled: meta.includeCancelled ?? false,
    excludeCancelled: meta.excludeCancelled ?? !(meta.includeCancelled ?? false),
    excludedCancelledSalesCount: toSafeNumber(meta.excludedCancelledSalesCount),
    generatedAt: meta.generatedAt || null,
    mockScenario: meta.mockScenario || null,
    notes: Array.isArray(meta.notes) ? meta.notes : [],
  },
});

export const normalizeSalesStatsQuery = (query = {}) => {
  const requestedPeriod = String(query.period || SALES_STATS_DEFAULT_PERIOD).trim().toLowerCase();
  const normalizedPeriod = Object.values(SALES_STATS_PERIODS).includes(requestedPeriod)
    ? requestedPeriod
    : SALES_STATS_DEFAULT_PERIOD;

  const includeCancelled = typeof query.includeCancelled === 'boolean'
    ? query.includeCancelled
    : typeof query.excludeCancelled === 'boolean'
      ? !query.excludeCancelled
      : false;

  return {
    period: normalizedPeriod,
    startDate: toDateOnlyString(query.startDate ?? query.from ?? null),
    endDate: toDateOnlyString(query.endDate ?? query.to ?? null),
    timezone: query.timezone || SALES_STATS_DEFAULT_TIMEZONE,
    includeCancelled,
    userId: query.userId || null,
    source: query.source === 'api' ? 'api' : 'mock',
    mockScenario: query.mockScenario || 'populated',
  };
};

export const buildSalesStatsRequestPayload = (query = {}) => {
  const normalizedQuery = normalizeSalesStatsQuery(query);

  return {
    period: normalizedQuery.period,
    from: normalizedQuery.startDate,
    to: normalizedQuery.endDate,
    timezone: normalizedQuery.timezone,
    includeCancelled: normalizedQuery.includeCancelled,
    ...(normalizedQuery.userId ? { userId: normalizedQuery.userId } : {}),
  };
};

export const normalizeSalesStatsResponse = (payload = {}, rawQuery = {}) => {
  const normalizedQuery = normalizeSalesStatsQuery(rawQuery);
  const users = sortUsersByMetricDesc(
    getArrayPayload(payload).map(normalizeStatsUser),
    'totalAmount'
  );
  const summaryPayload = payload.summary || payload.resume || payload.totals || {};
  const totalSalesFallback = users.reduce((accumulator, item) => accumulator + item.salesCount, 0);
  const totalAmountFallback = users.reduce((accumulator, item) => accumulator + item.totalAmount, 0);
  const totalSalesCount = toSafeNumber(
    summaryPayload.totalSalesCount ?? summaryPayload.totalSales ?? summaryPayload.quantitySales,
    totalSalesFallback
  );
  const totalAmount = roundToTwoDecimals(
    toSafeNumber(summaryPayload.totalAmount ?? summaryPayload.totalSold ?? summaryPayload.total, totalAmountFallback)
  );
  const activeSellersCount = toSafeNumber(summaryPayload.activeSellersCount ?? summaryPayload.activeUsers, users.length);
  const averageTicket = totalSalesCount > 0
    ? roundToTwoDecimals(summaryPayload.averageTicket ?? summaryPayload.avgTicket ?? totalAmount / totalSalesCount)
    : 0;

  return {
    summary: {
      totalSalesCount,
      totalAmount,
      activeSellersCount,
      averageTicket,
    },
    users,
    meta: {
      source: payload.meta?.source || normalizedQuery.source,
      isMockData: payload.meta?.isMockData ?? normalizedQuery.source !== 'api',
      period: payload.meta?.period || normalizedQuery.period,
      timezone: payload.meta?.timezone || normalizedQuery.timezone,
      effectiveRange: {
        startDate: normalizedQuery.startDate ?? summaryPayload.from ?? payload.meta?.effectiveRange?.startDate ?? null,
        endDate: normalizedQuery.endDate ?? summaryPayload.to ?? payload.meta?.effectiveRange?.endDate ?? null,
      },
      includeCancelled: payload.meta?.includeCancelled ?? normalizedQuery.includeCancelled,
      excludeCancelled: payload.meta?.excludeCancelled ?? !(payload.meta?.includeCancelled ?? normalizedQuery.includeCancelled),
      excludedCancelledSalesCount: toSafeNumber(payload.meta?.excludedCancelledSalesCount),
      generatedAt: payload.meta?.generatedAt || summaryPayload.generatedAt || new Date().toISOString(),
      mockScenario: payload.meta?.mockScenario || normalizedQuery.mockScenario || null,
      notes: Array.isArray(payload.meta?.notes) ? payload.meta.notes : [],
    },
  };
};

const fetchMockSalesStats = async (query = {}) => {
  const normalizedQuery = normalizeSalesStatsQuery(query);
  const mockFixture = getSalesStatsMockFixture(normalizedQuery.mockScenario);

  return normalizeSalesStatsResponse(mockFixture, normalizedQuery);
};

const fetchApiSalesStats = async (query = {}, apiPath = SALES_STATS_API_PATH) => {
  const normalizedQuery = normalizeSalesStatsQuery(query);
  const response = await apiClient.post(apiPath, buildSalesStatsRequestPayload(normalizedQuery));

  return normalizeSalesStatsResponse(response?.data, normalizedQuery);
};

export const getSalesStats = async (query = {}) => {
  const normalizedQuery = normalizeSalesStatsQuery(query);

  if (normalizedQuery.source === 'api') {
    return fetchApiSalesStats(normalizedQuery);
  }

  return fetchMockSalesStats(normalizedQuery);
};

export const getSalesStatsOverview = async (query = {}) => {
  const normalizedQuery = normalizeSalesStatsQuery(query);

  if (normalizedQuery.source === 'api') {
    return fetchApiSalesStats(normalizedQuery, SALES_STATS_OVERVIEW_API_PATH);
  }

  return fetchMockSalesStats(normalizedQuery);
};

const salesStatsService = {
  getSalesStats,
  getSalesStatsOverview,
  normalizeSalesStatsQuery,
  buildSalesStatsRequestPayload,
  normalizeSalesStatsResponse,
  createEmptySalesStats,
  SALES_STATS_API_PATH,
  SALES_STATS_OVERVIEW_API_PATH,
};

export default salesStatsService;
