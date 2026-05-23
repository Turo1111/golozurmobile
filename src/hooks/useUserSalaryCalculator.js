import { useCallback, useMemo, useState } from 'react';
import userStatsService from '../services/userStatsService';
import {
  calculateGainFromAmount,
  normalizePercentageInput,
  validateCustomRange,
} from '../utils/salesStats';

export const USER_SALARY_DEFAULT_PERCENTAGE = 5;

export default function useUserSalaryCalculator(options = {}) {
  const {
    source = 'mock',
    mockScenario = 'populated',
    initialPercentage = USER_SALARY_DEFAULT_PERCENTAGE,
  } = options;

  const [selectedUser, setSelectedUserState] = useState(null);
  const [percentage, setPercentageState] = useState(normalizePercentageInput(initialPercentage, USER_SALARY_DEFAULT_PERCENTAGE));
  const [range, setRangeState] = useState({ startDate: null, endDate: null });
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const rangeValidation = useMemo(() => validateCustomRange(range), [range]);

  const clearDerivedState = useCallback(() => {
    setResult(null);
    setError('');
    setStatus('idle');
  }, []);

  const setSelectedUser = useCallback((user) => {
    setSelectedUserState(user || null);
    clearDerivedState();
  }, [clearDerivedState]);

  const setRange = useCallback((nextRange) => {
    setRangeState((currentRange) => {
      const resolvedRange = typeof nextRange === 'function' ? nextRange(currentRange) : nextRange;

      return {
        startDate: resolvedRange?.startDate ?? null,
        endDate: resolvedRange?.endDate ?? null,
      };
    });
    clearDerivedState();
  }, [clearDerivedState]);

  const setPercentage = useCallback((nextValue) => {
    setPercentageState(normalizePercentageInput(nextValue, USER_SALARY_DEFAULT_PERCENTAGE));
    clearDerivedState();
  }, [clearDerivedState]);

  const reset = useCallback(() => {
    setPercentageState(USER_SALARY_DEFAULT_PERCENTAGE);
    setRangeState({ startDate: null, endDate: null });
    setResult(null);
    setStatus('idle');
    setError('');
  }, []);

  const calculateSalary = useCallback(async ({ user = selectedUser, startDate = range.startDate, endDate = range.endDate } = {}) => {
    if (!user?.userId) {
      setError('Seleccioná un usuario para calcular el sueldo.');
      setStatus('error');
      return { ok: false, reason: 'missing-user' };
    }

    const validation = validateCustomRange({ startDate, endDate });

    if (!validation.isValid) {
      setError(validation.message);
      setStatus('validating');
      return { ok: false, reason: validation.errorCode };
    }

    setError('');
    setStatus('calculating');

    try {
      const response = await userStatsService.getUserStatsByRange({
        source,
        mockScenario,
        period: 'custom',
        userId: user.userId,
        startDate,
        endDate,
      });
      const totalAmount = response.user?.totalAmount || 0;
      const estimatedSalary = calculateGainFromAmount(totalAmount, percentage);
      const nextResult = {
        userId: user.userId,
        startDate,
        endDate,
        percentage,
        totalAmount,
        estimatedSalary,
        isMockData: response.meta?.isMockData ?? true,
      };

      setResult(nextResult);
      setStatus('ready');

      return { ok: true, data: nextResult };
    } catch (requestError) {
      setError(requestError?.response?.data || requestError?.message || 'No se pudo calcular el sueldo estimado.');
      setStatus('error');
      return { ok: false, reason: 'request-failed', error: requestError };
    }
  }, [mockScenario, percentage, range.endDate, range.startDate, selectedUser, source]);

  return {
    selectedUser,
    setSelectedUser,
    percentage,
    setPercentage,
    range,
    setRange,
    rangeValidation,
    result,
    status,
    error,
    calculateSalary,
    reset,
    isIdle: status === 'idle',
    isValidating: status === 'validating',
    isCalculating: status === 'calculating',
    isReady: status === 'ready',
    isError: status === 'error',
  };
}
