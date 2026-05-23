import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import usePermissionCheck from '../hooks/usePermissionCheck';

const HEADER_BLUE = '#2563eb';

export default function ProductStats({ navigation }) {

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
            <Text style={styles.headerTitle}>Estadísticas de productos</Text>
            <Text style={styles.headerSubtitle}>Placeholder del futuro módulo</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Módulo diferido</Text>
          <Text style={styles.message}>Productos ya tiene una ruta propia dentro del hub, pero el analytics completo se implementa en un batch posterior. La idea es clara: separado del flujo operativo y sin volver a mezclar todo en una sola pantalla.</Text>
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
