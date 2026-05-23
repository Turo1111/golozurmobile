import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import MyBottomSheet from '../MyBottomSheet';
import useUserSalaryCalculator, { USER_SALARY_DEFAULT_PERCENTAGE } from '../../hooks/useUserSalaryCalculator';
import { normalizeDateInput } from '../../utils/salesStats';
import {
  formatStatsCurrency,
  formatStatsDate,
  formatStatsPercentage,
} from '../../utils/statsFormatters';

const DateField = ({ label, value, onPress }) => (
  <Pressable style={styles.dateField} onPress={onPress}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={styles.dateValueRow}>
      <Text style={styles.dateValue}>{formatStatsDate(value)}</Text>
      <Icon name="calendar" size={16} color="#64748b" />
    </View>
  </Pressable>
);

export function UserSalarySheetContent({
  selectedUser,
  initialRange,
  onBack,
  onClose,
  source = 'mock',
  mockScenario = 'populated',
}) {
  const {
    percentage,
    setPercentage,
    range,
    setRange,
    result,
    error,
    calculateSalary,
    reset,
    setSelectedUser,
    isCalculating,
    isReady,
    isValidating,
    isError,
  } = useUserSalaryCalculator({
    source,
    mockScenario,
  });
  const [activePicker, setActivePicker] = useState(null);

  const normalizedInitialRange = useMemo(() => ({
    startDate: normalizeDateInput(initialRange?.startDate),
    endDate: normalizeDateInput(initialRange?.endDate),
  }), [initialRange?.endDate, initialRange?.startDate]);

  useEffect(() => {
    setSelectedUser(selectedUser || null);
    setRange(normalizedInitialRange);
  }, [normalizedInitialRange, selectedUser, setRange, setSelectedUser]);

  useEffect(() => () => {
    setActivePicker(null);
    reset();
    setSelectedUser(null);
  }, [reset, setSelectedUser]);

  const handleDateChange = (field) => (_, value) => {
    setActivePicker(null);

    if (!value) {
      return;
    }

    setRange((currentRange) => ({
      ...currentRange,
      [field]: value,
    }));
  };

  const showFeedback = isValidating || isError;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.headerMainRow}>
          <Pressable style={styles.backButton} onPress={onBack}>
            <Icon name="arrow-left" size={18} color="#2563eb" />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Calcular sueldo</Text>
            <Text style={styles.headerSubtitle}>Cálculo manual y no persistente sobre ventas agregadas.</Text>
          </View>
        </View>
        <Pressable style={styles.closeButton} onPress={onClose}>
          <Icon name="x" size={18} color="#2563eb" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Usuario</Text>
          <Text style={styles.heroTitle}>{selectedUser?.userName || 'Sin usuario seleccionado'}</Text>
          {selectedUser?.roleName ? <Text style={styles.heroSubtitle}>{selectedUser.roleName}</Text> : null}
          {/* <Text style={styles.heroHint}>Por defecto se usa {formatStatsPercentage(USER_SALARY_DEFAULT_PERCENTAGE)} y podés cambiarlo sin guardar nada.</Text> */}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Rango personalizado</Text>
          <DateField label="Desde" value={range.startDate} onPress={() => setActivePicker('startDate')} />
          <DateField label="Hasta" value={range.endDate} onPress={() => setActivePicker('endDate')} />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.inputLabel}>Porcentaje manual</Text>
          <TextInput
            value={String(percentage)}
            onChangeText={setPercentage}
            keyboardType="numeric"
            placeholder="5"
            placeholderTextColor="#94a3b8"
            style={styles.textInput}
          />
          <Text style={styles.inputHint}>Este porcentaje sólo vive en pantalla y se aplica al cálculo actual.</Text>
        </View>

        {showFeedback ? (
          <View style={styles.feedbackCard}>
            <Icon name="alert-circle" size={18} color="#dc2626" />
            <Text style={styles.feedbackText}>{error}</Text>
          </View>
        ) : null}

        <Pressable style={[styles.primaryButton, isCalculating && styles.primaryButtonDisabled]} onPress={() => calculateSalary()} disabled={isCalculating}>
          <Text style={styles.primaryButtonText}>{isCalculating ? 'Calculando...' : 'Calcular sueldo'}</Text>
        </Pressable>

        {isReady && result ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultEyebrow}>Estimación visible</Text>
            {/* <Text style={styles.resultTitle}>Resultado no persistente</Text> */}
            <Text style={styles.resultLine}>Total vendido del rango: {formatStatsCurrency(result.totalAmount)}</Text>
            <Text style={styles.resultLine}>Porcentaje aplicado: {formatStatsPercentage(result.percentage)}</Text>
            <Text style={styles.resultSalary}>Sueldo estimado: {formatStatsCurrency(result.estimatedSalary)}</Text>
            {/* <Text style={styles.resultHint}>Esta cifra es una estimación calculada en pantalla y no modifica ventas históricas.</Text> */}
          </View>
        ) : null}
      </ScrollView>

      {activePicker ? (
        <DateTimePicker
          value={normalizeDateInput(range[activePicker]) || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange(activePicker)}
        />
      ) : null}
    </View>
  );
}

export default function UserSalarySheet({
  open,
  selectedUser,
  initialRange,
  onBack,
  onClose,
  source = 'mock',
  mockScenario = 'populated',
}) {
  return (
    <MyBottomSheet open={open} onClose={onClose} fullScreen>
      {open ? (
        <UserSalarySheetContent
          selectedUser={selectedUser}
          initialRange={initialRange}
          onBack={onBack}
          onClose={onClose}
          source={source}
          mockScenario={mockScenario}
        />
      ) : null}
    </MyBottomSheet>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
  },
  headerSubtitle: {
    color: '#64748b',
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 14,
  },
  heroEyebrow: {
    color: '#2563eb',
    fontSize: 12,
    fontFamily: 'Cairo-Bold',
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
  },
  heroSubtitle: {
    color: '#64748b',
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    marginTop: 2,
  },
  heroHint: {
    color: '#475569',
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    marginTop: 8,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    marginBottom: 12,
  },
  dateField: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  inputLabel: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    marginBottom: 4,
  },
  dateValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateValue: {
    color: '#0f172a',
    fontSize: 15,
    fontFamily: 'Cairo-Bold',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#0f172a',
    fontFamily: 'Cairo-Regular',
  },
  inputHint: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    marginTop: 8,
  },
  feedbackCard: {
    backgroundColor: '#fee2e2',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedbackText: {
    color: '#991b1b',
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    marginLeft: 8,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Cairo-Bold',
  },
  resultCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  resultEyebrow: {
    color: '#15803d',
    fontSize: 12,
    fontFamily: 'Cairo-Bold',
    textTransform: 'uppercase',
  },
  resultTitle: {
    color: '#14532d',
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    marginBottom: 8,
  },
  resultLine: {
    color: '#166534',
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    marginBottom: 4,
  },
  resultSalary: {
    color: '#14532d',
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    marginTop: 4,
  },
  resultHint: {
    color: '#15803d',
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    marginTop: 8,
  },
});
