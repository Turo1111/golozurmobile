import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { formatStatsCurrency, formatStatsDate } from '../utils/statsFormatters';

const HEADER_BLUE = '#2563eb';

export default function UserStatsDetails({ navigation, route }) {
  const user = route?.params?.user;
  const statsContext = route?.params?.statsContext || {};

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={18} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Detalle de usuario</Text>
            <Text style={styles.headerSubtitle}>Detalle mínimo con contexto real del flujo</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>Usuario seleccionado</Text>
          <Text style={styles.cardTitle}>{user?.userName || 'Usuario sin contexto'}</Text>
          {user?.roleName ? <Text style={styles.role}>{user.roleName}</Text> : null}

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Ventas agregadas</Text>
            <Text style={styles.metricValue}>{user?.salesCount || 0}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Total vendido</Text>
            <Text style={styles.metricValue}>{formatStatsCurrency(user?.totalAmount)}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Ticket promedio</Text>
            <Text style={styles.metricValue}>{formatStatsCurrency(user?.averageTicket)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>Contexto del período</Text>
          <Text style={styles.contextText}>Período: {statsContext.period || 'Sin definir'}</Text>
          <Text style={styles.contextText}>Desde: {formatStatsDate(statsContext.effectiveRange?.startDate)}</Text>
          <Text style={styles.contextText}>Hasta: {formatStatsDate(statsContext.effectiveRange?.endDate)}</Text>
          <Text style={styles.contextText}>Origen: {statsContext.isMockData ? 'Mock-first agregado' : 'Backend agregado'}</Text>
          <Text style={styles.contextHint}>Este detalle sigue siendo acotado, pero ya recibe el usuario seleccionado y el rango activo desde `UserStats` sin atajos fuera del flujo pensado.</Text>
        </View>
      </View>
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
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  cardEyebrow: {
    color: '#2563eb',
    fontSize: 12,
    fontFamily: 'Cairo-Bold',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  cardTitle: {
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
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
  },
  metricValue: {
    color: '#0f172a',
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
  },
  contextText: {
    color: '#334155',
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    marginBottom: 6,
  },
  contextHint: {
    color: '#64748b',
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    marginTop: 8,
  },
});
