import salesStatsService from './salesStatsService';

export const createEmptyStatsOverview = (meta = {}) => ({
  summary: {
    totalSalesCount: 0,
    totalAmount: 0,
    activeSellersCount: 0,
    averageTicket: 0,
  },
  meta: {
    source: meta.source || 'mock',
    isMockData: meta.isMockData ?? meta.source !== 'api',
    notes: Array.isArray(meta.notes) ? meta.notes : [],
    effectiveRange: meta.effectiveRange || {
      startDate: null,
      endDate: null,
    },
  },
});

export const getStatsOverview = async (query = {}) => {
  const response = await salesStatsService.getSalesStatsOverview(query);

  return {
    summary: response.summary,
    meta: response.meta,
  };
};

const statsOverviewService = {
  getStatsOverview,
  createEmptyStatsOverview,
};

export default statsOverviewService;
