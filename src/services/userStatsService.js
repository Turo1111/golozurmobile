import salesStatsService from './salesStatsService';
import {
  SALES_STATS_DEFAULT_PERIOD,
  SALES_STATS_DEFAULT_TIMEZONE,
  sortUsersByMetricDesc,
} from '../utils/salesStats';

export const createEmptyUserStats = (meta = {}) => ({
  users: [],
  summary: {
    totalSalesCount: 0,
    totalAmount: 0,
    activeSellersCount: 0,
    averageTicket: 0,
  },
  meta: {
    source: meta.source || 'mock',
    isMockData: meta.isMockData ?? meta.source !== 'api',
    period: meta.period || SALES_STATS_DEFAULT_PERIOD,
    timezone: meta.timezone || SALES_STATS_DEFAULT_TIMEZONE,
    effectiveRange: meta.effectiveRange || {
      startDate: null,
      endDate: null,
    },
    notes: Array.isArray(meta.notes) ? meta.notes : [],
  },
});

const mapUserStatsItem = (item = {}) => ({
  userId: item.userId,
  userName: item.userName,
  roleName: item.roleName || item.nameRole || null,
  salesCount: item.salesCount || 0,
  totalAmount: item.totalAmount || 0,
  averageTicket: item.averageTicket || 0,
});

export const getUserStats = async (query = {}) => {
  const response = await salesStatsService.getSalesStats(query);

  return {
    users: sortUsersByMetricDesc(response.users.map(mapUserStatsItem), 'totalAmount'),
    summary: response.summary,
    meta: response.meta,
  };
};

export const getUserStatsByRange = async ({ userId, ...query } = {}) => {
  const response = await salesStatsService.getSalesStats({
    ...query,
    userId,
  });
  const selectedUser = response.users.find((item) => item.userId === userId) || null;

  return {
    user: selectedUser,
    meta: response.meta,
  };
};

const userStatsService = {
  getUserStats,
  getUserStatsByRange,
  createEmptyUserStats,
};

export default userStatsService;
