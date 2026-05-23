import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import UserStatsActionSheet from '../components/stats/UserStatsActionSheet';
import UserStatsCard from '../components/stats/UserStatsCard';
import useUserStats from '../hooks/useUserStats';
import {
  normalizeDateInput,
  toDateOnlyString,
  validateCustomRange,
} from '../utils/salesStats';
import { formatStatsCurrency, formatStatsDate } from '../utils/statsFormatters';
import usePermissionCheck from '../hooks/usePermissionCheck';

const HEADER_BLUE = '#2563eb';

const StateCard = ({ icon, title, message }) => (
  <View style={styles.stateCard}>
    <View style={styles.stateIconContainer}>
      <Icon name={icon} size={24} color={HEADER_BLUE} />
    </View>
    <Text style={styles.stateTitle}>{title}</Text>
    <Text style={styles.stateMessage}>{message}</Text>
  </View>
);

export default function UserStats({ navigation }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [isUserSheetOpen, setIsUserSheetOpen] = useState(false);
  const [draftRange, setDraftRange] = useState({ startDate: null, endDate: null });
  const [rangeError, setRangeError] = useState('');
  const [pickerField, setPickerField] = useState(null);
  const {
    appliedFilters,
    users,
    summary,
    meta,
    error,
    refresh,
    reload,
    isConnected,
    hasResolvedConnectivity,
    isLoading,
    isRefreshing,
    isEmpty,
    isError,
    isOfflineBlocked,
  } = useUserStats({
    source: 'api',
    mockScenario: 'populated',
    requireOnline: true,
  });

  const { hasPermission: hasPermissionStats, isLoading: isLoadingReadStats } = usePermissionCheck('read_stats', () => { });

  useEffect(() => {
    const nextStartDate = normalizeDateInput(
      appliedFilters?.from || meta?.effectiveRange?.startDate || null
    );
    const nextEndDate = normalizeDateInput(
      appliedFilters?.to || meta?.effectiveRange?.endDate || null
    );

    setDraftRange({
      startDate: nextStartDate,
      endDate: nextEndDate,
    });
  }, [appliedFilters?.from, appliedFilters?.to, meta?.effectiveRange?.endDate, meta?.effectiveRange?.startDate]);

  const statsContext = useMemo(() => ({
    period: meta?.period || appliedFilters?.period || 'custom',
    effectiveRange: meta?.effectiveRange || {
      startDate: appliedFilters?.from || null,
      endDate: appliedFilters?.to || null,
    },
    source: meta?.source || 'api',
    isMockData: meta?.isMockData ?? false,
  }), [appliedFilters?.from, appliedFilters?.period, appliedFilters?.to, meta]);

  const connectivityColor = !hasResolvedConnectivity
    ? '#FBBF24'
    : isConnected
      ? '#4CAF50'
      : '#F87171';

  const connectivityLabel = !hasResolvedConnectivity
    ? 'Verificando'
    : isConnected
      ? 'En línea'
      : 'Sin conexión';

  const closeUserSheet = () => {
    setIsUserSheetOpen(false);
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setIsUserSheetOpen(true);
  };

  const handleRangeDateChange = (field, nextValue) => {
    setDraftRange((currentRange) => ({
      ...currentRange,
      [field]: normalizeDateInput(nextValue),
    }));
    setRangeError('');
  };

  const handlePickerChange = (event, selectedDate) => {
    const currentField = pickerField;

    if (Platform.OS === 'android') {
      setPickerField(null);
    }

    if (event?.type === 'dismissed' || !selectedDate || !currentField) {
      return;
    }

    handleRangeDateChange(currentField, selectedDate);
  };

  const handleApplyCustomRange = async () => {
    const validationResult = validateCustomRange(draftRange);

    if (!validationResult.isValid) {
      setRangeError(validationResult.message);
      return;
    }

    setRangeError('');
    await reload({
      overrides: {
        period: 'custom',
        from: toDateOnlyString(draftRange.startDate),
        to: toDateOnlyString(draftRange.endDate),
        timezone: meta?.timezone || appliedFilters?.timezone,
      },
    });
  };

  const pickerValue = pickerField === 'endDate'
    ? draftRange.endDate || draftRange.startDate || new Date()
    : draftRange.startDate || draftRange.endDate || new Date();

  const renderHeader = () => (
    <>
      <View style={styles.summaryCard}>
        <View style={styles.summaryCardTopRow}>
          <View>
            <Text style={styles.summaryLabel}>Usuarios con actividad</Text>
            <Text style={styles.summaryValue}>{summary.activeSellersCount || users.length}</Text>
          </View>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillText}>{meta?.isMockData ? 'Mock inicial' : 'Backend'}</Text>
          </View>
        </View>

        <View style={styles.summaryMetricsRow}>
          <View style={styles.summaryMetricBlock}>
            <Text style={styles.metricLabel}>Total vendido</Text>
            <Text style={styles.metricValue}>{formatStatsCurrency(summary.totalAmount)}</Text>
          </View>
          <View style={styles.summaryMetricBlock}>
            <Text style={styles.metricLabel}>Ticket promedio</Text>
            <Text style={styles.metricValue}>{formatStatsCurrency(summary.averageTicket)}</Text>
          </View>
        </View>

        <Text style={styles.summaryHint}>
          Rango actual: {formatStatsDate(meta?.effectiveRange?.startDate)} - {formatStatsDate(meta?.effectiveRange?.endDate)}
        </Text>
      </View>

      <View style={styles.filtersCard}>
        <View style={styles.filtersHeader}>
          <View>
            <Text style={styles.filtersTitle}>Rango personalizado</Text>
            <Text style={styles.filtersSubtitle}>Elegí desde y hasta para recargar este listado.</Text>
          </View>
          <View style={styles.customBadge}>
            <Text style={styles.customBadgeText}>
              {appliedFilters?.period === 'custom' ? 'Aplicado' : 'Mensual'}
            </Text>
          </View>
        </View>

        <View style={styles.dateFieldsRow}>
          <Pressable style={styles.dateField} onPress={() => setPickerField('startDate')}>
            <Text style={styles.dateFieldLabel}>Desde</Text>
            <Text style={styles.dateFieldValue}>{formatStatsDate(draftRange.startDate)}</Text>
          </Pressable>

          <Pressable style={[styles.dateField, styles.dateFieldWithGap]} onPress={() => setPickerField('endDate')}>
            <Text style={styles.dateFieldLabel}>Hasta</Text>
            <Text style={styles.dateFieldValue}>{formatStatsDate(draftRange.endDate)}</Text>
          </Pressable>
        </View>

        {rangeError ? <Text style={styles.validationText}>{rangeError}</Text> : null}

        <TouchableOpacity style={styles.applyButton} onPress={handleApplyCustomRange}>
          <Text style={styles.applyButtonText}>Aplicar rango</Text>
        </TouchableOpacity>

        {pickerField ? (
          <View style={styles.pickerWrapper}>
            {Platform.OS === 'ios' ? (
              <TouchableOpacity style={styles.pickerDoneButton} onPress={() => setPickerField(null)}>
                <Text style={styles.pickerDoneButtonText}>Listo</Text>
              </TouchableOpacity>
            ) : null}

            <DateTimePicker
              value={pickerValue}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handlePickerChange}
              maximumDate={new Date()}
            />
          </View>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Equipo</Text>
    </>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={HEADER_BLUE} />
          <Text style={styles.loadingTitle}>Preparando estadísticas de usuarios</Text>
          <Text style={styles.loadingMessage}>Estamos cargando la lista agregada para que puedas explorar usuarios y abrir acciones puntuales.</Text>
        </View>
      );
    }

    if (isOfflineBlocked) {
      return (
        <StateCard
          icon="wifi-off"
          title="Módulo bloqueado sin conexión"
          message="Este módulo sigue siendo online-first y depende de una fuente agregada, no de listados operativos offline."
        />
      );
    }

    if (isError) {
      return (
        <StateCard
          icon="alert-triangle"
          title="No pudimos cargar el módulo"
          message={error || 'Volvé a intentar en unos segundos.'}
        />
      );
    }

    if (isEmpty) {
      return (
        <View style={styles.listContainer}>
          {renderHeader()}
          <StateCard
            icon="inbox"
            title="Sin actividad en el período"
            message="Cuando haya ventas válidas agregadas para este rango, vas a ver a los usuarios listados acá."
          />
        </View>
      );
    }

    return (
      <FlatList
        data={users}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => <UserStatsCard user={item} onPress={handleSelectUser} />}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={renderHeader}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={HEADER_BLUE} />}
      />
    );
  };

  if (isLoadingReadStats || !hasPermissionStats) {
    return null
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Icon name="arrow-left" size={18} color="#fff" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Estadísticas de usuarios</Text>
              <Text style={styles.headerSubtitle}>Listado analítico por usuario</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            {/* <View style={styles.onlineBadge}>
              <View style={[styles.onlineDot, { backgroundColor: connectivityColor }]} />
              <Text style={styles.onlineText}>{connectivityLabel}</Text>
            </View> */}
            <TouchableOpacity onPress={refresh} style={styles.refreshButton}>
              <Icon name="refresh-cw" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.contentContainer}>{renderContent()}</View>

      <UserStatsActionSheet
        open={isUserSheetOpen}
        selectedUser={selectedUser}
        onClose={closeUserSheet}
        statsContext={statsContext}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f8fa',
  },
  headerContainer: {
    backgroundColor: HEADER_BLUE,
    paddingTop: 40,
    paddingBottom: 18,
    paddingHorizontal: 15,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    marginRight: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
  },
  headerSubtitle: {
    color: '#dbeafe',
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  onlineBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginRight: 8,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  onlineText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    marginLeft: 4,
  },
  refreshButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
  },
  contentContainer: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
  },
  filtersCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  filtersTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
  },
  filtersSubtitle: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    marginTop: 2,
  },
  customBadge: {
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 12,
  },
  customBadgeText: {
    color: '#2563eb',
    fontSize: 11,
    fontFamily: 'Cairo-Bold',
    textTransform: 'uppercase',
  },
  dateFieldsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  dateField: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateFieldWithGap: {
    marginLeft: 10,
  },
  dateFieldLabel: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
  },
  dateFieldValue: {
    color: '#0f172a',
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
    marginTop: 4,
  },
  validationText: {
    color: '#dc2626',
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    marginBottom: 10,
  },
  pickerWrapper: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  pickerDoneButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 4,
  },
  pickerDoneButtonText: {
    color: '#2563eb',
    fontSize: 13,
    fontFamily: 'Cairo-Bold',
  },
  applyButton: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
  },
  summaryCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
  },
  summaryValue: {
    color: '#0f172a',
    fontSize: 22,
    fontFamily: 'Cairo-Bold',
  },
  summaryPill: {
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  summaryPillText: {
    color: '#2563eb',
    fontSize: 11,
    fontFamily: 'Cairo-Bold',
    textTransform: 'uppercase',
  },
  summaryMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryMetricBlock: {
    flex: 1,
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
  summaryHint: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    marginBottom: 12,
  },
  loadingCard: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    marginTop: 12,
    textAlign: 'center',
  },
  loadingMessage: {
    color: '#64748b',
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    marginTop: 8,
    textAlign: 'center',
  },
  stateCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    margin: 16,
  },
  stateIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbeafe',
    marginBottom: 12,
  },
  stateTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    textAlign: 'center',
  },
  stateMessage: {
    color: '#64748b',
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    textAlign: 'center',
    marginTop: 8,
  },
});
