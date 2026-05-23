import {
  SALES_STATS_DEFAULT_PERIOD,
  SALES_STATS_DEFAULT_TIMEZONE,
} from '../utils/salesStats';

const buildBaseMeta = (overrides = {}) => ({
  source: 'mock',
  isMockData: true,
  period: SALES_STATS_DEFAULT_PERIOD,
  timezone: SALES_STATS_DEFAULT_TIMEZONE,
  generatedAt: '2026-04-17T12:00:00.000Z',
  effectiveRange: {
    startDate: '2026-04-01',
    endDate: '2026-04-17',
  },
  excludeCancelled: true,
  excludedCancelledSalesCount: 0,
  notes: [],
  ...overrides,
});

export const salesStatsMockFixtures = {
  populated: {
    summary: {
      totalSalesCount: 18,
      totalAmount: 248930.5,
      activeSellersCount: 4,
      averageTicket: 13829.47,
    },
    users: [
      {
        userId: 'usr-101',
        userName: 'Matías Gómez',
        roleName: 'Administrador',
        salesCount: 6,
        totalAmount: 88210.25,
        averageTicket: 14701.71,
      },
      {
        userId: 'usr-102',
        userName: 'Camila Soto',
        roleName: 'Vendedora',
        salesCount: 5,
        totalAmount: 73110,
        averageTicket: 14622,
      },
      {
        userId: 'usr-103',
        userName: 'Lucía Pereyra',
        roleName: 'Supervisora',
        salesCount: 4,
        totalAmount: 51480.25,
        averageTicket: 12870.06,
      },
      {
        userId: 'usr-104',
        userName: 'Tomás Roldán',
        roleName: 'Vendedor',
        salesCount: 3,
        totalAmount: 36130,
        averageTicket: 12043.33,
      },
    ],
    meta: buildBaseMeta({
      mockScenario: 'populated',
      notes: ['Fixture base con ventas agregadas por usuario.'],
    }),
  },
  empty: {
    summary: {
      totalSalesCount: 0,
      totalAmount: 0,
      activeSellersCount: 0,
      averageTicket: 0,
    },
    users: [],
    meta: buildBaseMeta({
      mockScenario: 'empty',
      effectiveRange: {
        startDate: '2026-04-18',
        endDate: '2026-04-18',
      },
      notes: ['Fixture para estado vacío sin vendedores activos en el período.'],
    }),
  },
  cancelledExcluded: {
    summary: {
      totalSalesCount: 9,
      totalAmount: 120450,
      activeSellersCount: 3,
      averageTicket: 13383.33,
    },
    users: [
      {
        userId: 'usr-201',
        userName: 'Nadia Acosta',
        roleName: 'Vendedora',
        salesCount: 4,
        totalAmount: 55600,
        averageTicket: 13900,
      },
      {
        userId: 'usr-202',
        userName: 'Bruno Díaz',
        roleName: 'Vendedor',
        salesCount: 3,
        totalAmount: 38950,
        averageTicket: 12983.33,
      },
      {
        userId: 'usr-203',
        userName: 'Valentina Ruiz',
        roleName: 'Encargada',
        salesCount: 2,
        totalAmount: 25900,
        averageTicket: 12950,
      },
    ],
    meta: buildBaseMeta({
      mockScenario: 'cancelledExcluded',
      effectiveRange: {
        startDate: '2026-03-01',
        endDate: '2026-03-31',
      },
      excludedCancelledSalesCount: 2,
      notes: [
        'Fixture alineada con la regla de excluir ventas canceladas.',
        'Si excludeCancelled es false, backend futuro podría devolver más monto y más cantidad.',
      ],
    }),
  },
};

export const getSalesStatsMockFixture = (scenario = 'populated') => {
  return salesStatsMockFixtures[scenario] || salesStatsMockFixtures.populated;
};

export const salesStatsMockScenarioOptions = Object.keys(salesStatsMockFixtures);

export default salesStatsMockFixtures;
