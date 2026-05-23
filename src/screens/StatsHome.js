import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import StatsModuleCard from '../components/stats/StatsModuleCard';
import useStatsOverview from '../hooks/useStatsOverview';

const HEADER_BLUE = '#2563eb';

const formatCurrency = (value = 0) => {
  const amount = Number(value) || 0;
  return `$${amount.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const SummaryCard = ({ label, value, hint }) => (
  <View style={styles.summaryCard}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryHint}>{hint}</Text>
  </View>
);

const InfoState = ({ icon, title, message }) => (
  <View style={styles.stateCard}>
    <View style={styles.stateIconContainer}>
      <Icon name={icon} size={24} color={HEADER_BLUE} />
    </View>
    <Text style={styles.stateTitle}>{title}</Text>
    <Text style={styles.stateMessage}>{message}</Text>
  </View>
);

export default function StatsHome({ navigation }) {
  const {
    summary,
    meta,
    error,
    refresh,
    isLoading,
    isRefreshing,
    isError,
    isOfflineBlocked,
  } = useStatsOverview({
    source: 'api',
    mockScenario: 'populated',
    requireOnline: true,
  });

  const renderOverview = () => {
    if (isLoading) {
      return (
        <View style={styles.blockCard}>
          <ActivityIndicator size="large" color={HEADER_BLUE} />
          <Text style={styles.loadingTitle}>Preparando el centro de estadísticas</Text>
          <Text style={styles.loadingMessage}>Traemos un resumen básico desde el backend agregado para ordenar los módulos del negocio.</Text>
        </View>
      );
    }

    if (isOfflineBlocked) {
      return (
        <InfoState
          icon="wifi-off"
          title="Sin conexión para analytics"
          message="Este resumen usa datos agregados del negocio y no se reconstruye desde listados operativos offline."
        />
      );
    }

    if (isError) {
      return (
        <InfoState
          icon="alert-triangle"
          title="No pudimos cargar el resumen"
          message={error || 'Volvé a intentar en unos segundos.'}
        />
      );
    }

    return (
      <View style={styles.summaryGrid}>
        <SummaryCard label="Total vendido" value={formatCurrency(summary.totalAmount)} hint="Vista general del período actual" />
        <SummaryCard label="Ventas" value={`${summary.totalSalesCount || 0}`} hint="Operaciones agregadas" />
        <SummaryCard label="Vendedores activos" value={`${summary.activeSellersCount || 0}`} hint="Usuarios con actividad" />
        <SummaryCard label="Ticket promedio" value={formatCurrency(summary.averageTicket)} hint={meta?.isMockData ? 'Mock-first' : 'Backend agregado'} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Icon name="arrow-left" size={18} color="#fff" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Estadísticas</Text>
              <Text style={styles.headerSubtitle}>Centro modular del negocio</Text>
            </View>
          </View>
          <TouchableOpacity onPress={refresh} style={styles.refreshButton}>
            <Icon name="refresh-cw" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={HEADER_BLUE} />}
      >
        {/* <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Primera etapa</Text>
          <Text style={styles.heroTitle}>Entrá desde un hub y no desde una pantalla monolítica.</Text>
          <Text style={styles.heroMessage}>
            En este slice abrimos la arquitectura modular: resumen básico, módulo de usuarios como prioridad y placeholders claros para ventas y productos.
          </Text>
        </View> */}

        <Text style={styles.sectionTitle}>Resumen general</Text>
        {renderOverview()}

        <Text style={styles.sectionTitle}>Módulos</Text>
        <StatsModuleCard
          icon="account-group-outline"
          color="#6e8c47"
          title="Usuarios"
          description="Primera costura real para estadísticas por usuario y cálculo de sueldo en próximas iteraciones."
          badge="Activo"
          onPress={() => navigation.navigate('UserStats')}
        />
        <StatsModuleCard
          icon="chart-bar"
          color="#2563eb"
          title="Ventas"
          description="Módulo reservado para migrar las estadísticas de ventas fuera del layout viejo."
          badge="Próximo"
          onPress={() => navigation.navigate('SalesStats')}
        />
        <StatsModuleCard
          icon="cube-outline"
          color="#f59e0b"
          title="Productos"
          description="Placeholder del futuro módulo de productos, separado del flujo operativo actual."
          badge="Próximo"
          onPress={() => navigation.navigate('ProductStats')}
        />
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    marginRight: 10,
  },
  refreshButton: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  heroEyebrow: {
    color: '#2563eb',
    fontSize: 12,
    fontFamily: 'Cairo-Bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    marginBottom: 8,
  },
  heroMessage: {
    color: '#475569',
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    marginBottom: 12,
  },
  blockCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 18,
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
    textAlign: 'center',
    marginTop: 8,
  },
  stateCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 18,
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
  },
  summaryValue: {
    color: '#0f172a',
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    marginTop: 6,
  },
  summaryHint: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    marginTop: 6,
  },
});
