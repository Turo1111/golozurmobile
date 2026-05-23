import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import usePermissionCheck from '../hooks/usePermissionCheck';

const HEADER_BLUE = '#2563eb';

export default function SalesStats({ navigation }) {

  const { hasPermission: hasPermissionStats, isLoading: isLoadingReadStats } = usePermissionCheck('read_stats', () => { });

  if (isLoadingReadStats || !hasPermissionStats) {
    return null
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={18} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Estadísticas de ventas</Text>
            <Text style={styles.headerSubtitle}>Wrapper del módulo futuro</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Migración controlada</Text>
          <Text style={styles.message}>La antigua pantalla monolítica deja de ser el entrypoint del home. Desde ahora esta ruta queda reservada para el módulo de ventas que se reconstruirá sobre seams modulares, sin mezclar overview, usuarios y cálculo de sueldo en el mismo lugar.</Text>
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
  },
  title: {
    color: '#0f172a',
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    marginBottom: 8,
  },
  message: {
    color: '#475569',
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
  },
});
