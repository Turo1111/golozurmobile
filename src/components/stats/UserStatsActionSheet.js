import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import MyBottomSheet from '../MyBottomSheet';
import { UserSalarySheetContent } from './UserSalarySheet';
import { formatStatsCurrency, formatStatsDate } from '../../utils/statsFormatters';

const ActionButton = ({ icon, title, description, onPress }) => (
  <Pressable style={styles.actionButton} onPress={onPress}>
    <View style={styles.actionIconContainer}>
      <Icon name={icon} size={18} color="#2563eb" />
    </View>
    <View style={styles.actionContent}>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionDescription}>{description}</Text>
    </View>
    <Icon name="chevron-right" size={18} color="#94a3b8" />
  </Pressable>
);

const MetricRow = ({ label, value, highlighted = false }) => (
  <View style={styles.metricRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={[styles.detailValue, highlighted && styles.detailValueHighlighted]}>{value}</Text>
  </View>
);

function MainMenuStep({ selectedUser, onMoreDetails, onCalculateSalary }) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.eyebrow}>Usuario seleccionado</Text>
      <Text style={styles.title}>{selectedUser?.userName || 'Sin usuario'}</Text>
      {selectedUser?.roleName ? <Text style={styles.role}>{selectedUser.roleName}</Text> : null}

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Ventas</Text>
          <Text style={styles.metricValue}>{selectedUser?.salesCount || 0}</Text>
        </View>
        <View style={styles.metricCardNoGap}>
          <Text style={styles.metricLabel}>Total vendido</Text>
          <Text style={styles.metricValue}>{formatStatsCurrency(selectedUser?.totalAmount)}</Text>
        </View>
      </View>

      <ActionButton
        icon="bar-chart-2"
        title="Más detalles"
        description="Revisá el detalle ampliado sin salir de este mismo panel."
        onPress={onMoreDetails}
      />
      <ActionButton
        icon="dollar-sign"
        title="Calcular sueldo"
        description="Estimá el sueldo con porcentaje manual y rango personalizado."
        onPress={onCalculateSalary}
      />
    </ScrollView>
  );
}

function DetailsStep({ selectedUser, statsContext, onBack, onClose }) {
  const detailsRange = useMemo(() => ({
    startDate: statsContext?.effectiveRange?.startDate,
    endDate: statsContext?.effectiveRange?.endDate,
  }), [statsContext?.effectiveRange?.endDate, statsContext?.effectiveRange?.startDate]);

  return (
    <View style={styles.stepWrapper}>
      <View style={styles.stepHeader}>
        <View style={styles.stepHeaderMain}>
          <Pressable style={styles.iconButton} onPress={onBack}>
            <Icon name="arrow-left" size={18} color="#2563eb" />
          </Pressable>
          <View style={styles.stepHeaderCopy}>
            <Text style={styles.stepTitle}>Más detalles</Text>
            <Text style={styles.stepSubtitle}>Detalle ampliado con el contexto actual del período.</Text>
          </View>
        </View>
        <Pressable style={styles.iconButton} onPress={onClose}>
          <Icon name="x" size={18} color="#2563eb" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.detailCard}>
          <Text style={styles.detailEyebrow}>Usuario</Text>
          <Text style={styles.detailTitle}>{selectedUser?.userName || 'Sin usuario seleccionado'}</Text>
          {selectedUser?.roleName ? <Text style={styles.role}>{selectedUser.roleName}</Text> : null}

          <MetricRow label="Ventas agregadas" value={selectedUser?.salesCount || 0} />
          <MetricRow label="Total vendido" value={formatStatsCurrency(selectedUser?.totalAmount)} />
          <MetricRow label="Ticket promedio" value={formatStatsCurrency(selectedUser?.averageTicket)} />
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.detailEyebrow}>Contexto del período</Text>
          <MetricRow label="Período" value={statsContext?.period || 'Sin definir'} />
          <MetricRow label="Desde" value={formatStatsDate(detailsRange.startDate)} />
          <MetricRow label="Hasta" value={formatStatsDate(detailsRange.endDate)} />
          <MetricRow
            label="Origen"
            value={statsContext?.isMockData ? 'Mock-first agregado' : 'Backend agregado'}
            highlighted
          />
          <Text style={styles.detailHint}>
            Este detalle se mantiene dentro del mismo bottom sheet para evitar cierres y aperturas visuales innecesarias.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

export default function UserStatsActionSheet({
  open,
  selectedUser,
  onClose,
  statsContext,
}) {
  const [step, setStep] = useState('menu');

  useEffect(() => {
    if (!open) {
      setStep('menu');
    }
  }, [open]);

  useEffect(() => {
    setStep('menu');
  }, [selectedUser?.userId]);

  return (
    <MyBottomSheet open={open} onClose={onClose} heightPercent={0.9}>
      <View style={styles.container}>
        {step === 'menu' ? (
          <MainMenuStep
            selectedUser={selectedUser}
            onMoreDetails={() => setStep('details')}
            onCalculateSalary={() => setStep('salary')}
          />
        ) : null}

        {step === 'details' ? (
          <DetailsStep
            selectedUser={selectedUser}
            statsContext={statsContext}
            onBack={() => setStep('menu')}
            onClose={onClose}
          />
        ) : null}

        {step === 'salary' ? (
          <UserSalarySheetContent
            selectedUser={selectedUser}
            initialRange={statsContext?.effectiveRange}
            onBack={() => setStep('menu')}
            onClose={onClose}
            source={statsContext?.source || 'api'}
            mockScenario="populated"
          />
        ) : null}
      </View>
    </MyBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  stepWrapper: {
    flex: 1,
  },
  eyebrow: {
    color: '#2563eb',
    fontSize: 12,
    fontFamily: 'Cairo-Bold',
    textTransform: 'uppercase',
  },
  title: {
    color: '#0f172a',
    fontSize: 22,
    fontFamily: 'Cairo-Bold',
  },
  role: {
    color: '#64748b',
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    marginTop: 2,
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginRight: 10,
  },
  metricCardNoGap: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
  },
  metricValue: {
    color: '#0f172a',
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
    marginRight: 12,
  },
  actionTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
  },
  actionDescription: {
    color: '#64748b',
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    marginTop: 2,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  stepHeaderMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  stepHeaderCopy: {
    flex: 1,
  },
  stepTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
  },
  stepSubtitle: {
    color: '#64748b',
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  detailEyebrow: {
    color: '#2563eb',
    fontSize: 12,
    fontFamily: 'Cairo-Bold',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  detailTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  detailLabel: {
    color: '#64748b',
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    marginRight: 10,
    flex: 1,
  },
  detailValue: {
    color: '#0f172a',
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
    textAlign: 'right',
    flex: 1,
  },
  detailValueHighlighted: {
    color: '#2563eb',
  },
  detailHint: {
    color: '#64748b',
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    marginTop: 12,
  },
});
