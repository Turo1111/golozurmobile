export const SALES_STATS_PERIODS = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
  CUSTOM: 'custom',
};

export const SALES_STATS_CHART_METRICS = {
  TOTAL_AMOUNT: 'totalAmount',
  SALES_COUNT: 'salesCount',
  CALCULATED_GAIN: 'calculatedGain',
};

export const SALES_STATS_SCREEN_STATES = {
  LOADING: 'loading',
  REFRESHING: 'refreshing',
  READY: 'ready',
  EMPTY: 'empty',
  ERROR: 'error',
  OFFLINE_BLOCKED: 'offlineBlocked',
};

export const SALES_STATS_DEFAULT_TIMEZONE = 'America/Argentina/Buenos_Aires';
export const SALES_STATS_DEFAULT_PERIOD = SALES_STATS_PERIODS.MONTH;
export const SALES_STATS_DEFAULT_CHART_METRIC = SALES_STATS_CHART_METRICS.TOTAL_AMOUNT;
export const SALES_STATS_DEFAULT_PERCENTAGE = 0;
export const SALES_STATS_MAX_CUSTOM_RANGE_DAYS = 366;

export const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const roundToTwoDecimals = (value) => {
  return Math.round((toSafeNumber(value) + Number.EPSILON) * 100) / 100;
};

export const normalizePercentageInput = (value, fallback = SALES_STATS_DEFAULT_PERCENTAGE) => {
  const numericValue = toSafeNumber(value, fallback);
  return Math.min(100, Math.max(0, roundToTwoDecimals(numericValue)));
};

export const calculateGainFromAmount = (amount, percentage) => {
  return roundToTwoDecimals(toSafeNumber(amount) * (normalizePercentageInput(percentage) / 100));
};

export const normalizeDateInput = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

export const toDateOnlyString = (value) => {
  const normalizedDate = normalizeDateInput(value);

  if (!normalizedDate) {
    return null;
  }

  const year = normalizedDate.getFullYear();
  const month = `${normalizedDate.getMonth() + 1}`.padStart(2, '0');
  const day = `${normalizedDate.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const getDifferenceInCalendarDays = (startDate, endDate) => {
  const normalizedStartDate = normalizeDateInput(startDate);
  const normalizedEndDate = normalizeDateInput(endDate);

  if (!normalizedStartDate || !normalizedEndDate) {
    return null;
  }

  const startAtMidnight = new Date(
    normalizedStartDate.getFullYear(),
    normalizedStartDate.getMonth(),
    normalizedStartDate.getDate()
  );
  const endAtMidnight = new Date(
    normalizedEndDate.getFullYear(),
    normalizedEndDate.getMonth(),
    normalizedEndDate.getDate()
  );

  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.floor((endAtMidnight.getTime() - startAtMidnight.getTime()) / millisecondsPerDay);
};

export const validateCustomRange = ({
  startDate,
  endDate,
  maxRangeDays = SALES_STATS_MAX_CUSTOM_RANGE_DAYS,
} = {}) => {
  const normalizedStartDate = normalizeDateInput(startDate);
  const normalizedEndDate = normalizeDateInput(endDate);

  if (!normalizedStartDate || !normalizedEndDate) {
    return {
      isValid: false,
      errorCode: 'missing-range',
      message: 'Seleccioná una fecha desde y una fecha hasta.',
    };
  }

  const differenceInDays = getDifferenceInCalendarDays(normalizedStartDate, normalizedEndDate);

  if (differenceInDays < 0) {
    return {
      isValid: false,
      errorCode: 'invalid-order',
      message: 'La fecha desde no puede ser mayor a la fecha hasta.',
    };
  }

  if (differenceInDays > maxRangeDays) {
    return {
      isValid: false,
      errorCode: 'range-too-large',
      message: `El rango personalizado no puede superar ${maxRangeDays} días.`,
    };
  }

  return {
    isValid: true,
    errorCode: null,
    message: '',
  };
};

export const sortUsersByMetricDesc = (items = [], metric = SALES_STATS_CHART_METRICS.TOTAL_AMOUNT) => {
  return [...items].sort((left, right) => {
    const leftValue = toSafeNumber(left?.[metric]);
    const rightValue = toSafeNumber(right?.[metric]);

    if (rightValue !== leftValue) {
      return rightValue - leftValue;
    }

    return String(left?.userName || '').localeCompare(String(right?.userName || ''));
  });
};
