import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import Icon from 'react-native-vector-icons/Feather'
import useRequireAdmin from '../hooks/useRequireAdmin'
import {
  getGroups,
  getServiceState,
  getWhatsappClients,
  sendServiceCommand,
  updateGroup
} from '../services/whatsappApi'

const HEADER_BLUE = '#2563eb'
const WA_GREEN = '#25D366'
const POLL_MS = 5000

const DAY_LABELS = {
  0: 'Dom',
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb'
}

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

const SESSION_LABELS = {
  ready: 'Vinculada',
  connecting: 'Vinculando',
  unlinked: 'Sin vincular',
  paused: 'En pausa'
}

export default function WhatsappHome ({ navigation }) {
  const { isAdmin } = useRequireAdmin(navigation)
  const [serviceState, setServiceState] = useState(null)
  const [groups, setGroups] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const mounted = useRef(true)

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true)
    }
    try {
      const [stateResponse, groupsResponse, clientsResponse] = await Promise.all([
        getServiceState(),
        getGroups(),
        getWhatsappClients({ limit: 1 })
      ])
      if (!mounted.current) {
        return
      }
      setServiceState(stateResponse.data)
      const payload = groupsResponse.data
      setGroups(Array.isArray(payload) ? payload : (payload?.items || []))
      setSummary(clientsResponse.data?.summary || null)
    } catch (error) {
      if (mounted.current) {
        Alert.alert('No se pudo cargar WhatsApp', errorMessage(error))
      }
    } finally {
      if (mounted.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    load()
    const timer = setInterval(() => {
      getServiceState()
        .then(({ data }) => { if (mounted.current) setServiceState(data) })
        .catch(() => {})
    }, POLL_MS)
    const unsubscribe = navigation.addListener('focus', () => { load({ silent: true }) })
    return () => {
      mounted.current = false
      clearInterval(timer)
      unsubscribe()
    }
  }, [load, navigation])

  const onRefresh = () => {
    setRefreshing(true)
    load({ silent: true })
  }

  const toggleGroup = async (group, activo) => {
    setGroups((previous) => previous.map((item) => (
      item._id === group._id ? { ...item, activo } : item
    )))
    try {
      await updateGroup(group._id, { activo })
    } catch (error) {
      setGroups((previous) => previous.map((item) => (
        item._id === group._id ? { ...item, activo: !activo } : item
      )))
      Alert.alert('No se pudo actualizar el grupo', errorMessage(error))
    }
  }

  const sendNow = (group) => {
    Alert.alert(
      `Enviar ${group.nombre} ahora`,
      `Se enviará "${group.mensaje}" a ${group.clientesConTelefono} cliente(s) con teléfono activo, de ${group.totalClientes} asignado(s).`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar ahora',
          onPress: async () => {
            try {
              await sendServiceCommand('send_group_now', { groupId: group._id })
              Alert.alert('Envío encolado', 'El worker ejecutará la tanda en el próximo ciclo de sincronización.')
            } catch (error) {
              Alert.alert('No se pudo encolar el envío', errorMessage(error))
            }
          }
        }
      ]
    )
  }

  if (!isAdmin) {
    return null
  }

  const workerOnline = serviceState?.workerOnline === true
  const session = serviceState?.workerStatus?.session || 'unlinked'
  const automationEnabled = serviceState?.config?.automationEnabled !== false

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Icon name="arrow-left" size={18} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>WhatsApp Automatizado</Text>
            <Text style={styles.headerSubtitle}>Grupos, agenda y difusión</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('WhatsappServiceConfig')} style={styles.iconButton}>
            <Icon name="settings" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={HEADER_BLUE} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.statusBanner}>
            <View style={styles.statusLine}>
              <View style={[styles.dot, { backgroundColor: workerOnline ? '#10B981' : '#EF4444' }]} />
              <Text style={styles.statusText}>{workerOnline ? 'Worker online' : 'Worker sin conexión'}</Text>
              <Text style={styles.statusSeparator}>·</Text>
              <Text style={styles.statusText}>{SESSION_LABELS[session] || session}</Text>
            </View>
            <Text style={[styles.automationText, { color: automationEnabled ? '#065F46' : '#B45309' }]}>
              {automationEnabled ? 'Automatización activa' : 'Automatización pausada'}
            </Text>
            {!workerOnline && (
              <Text style={styles.statusHint}>
                Podés administrar grupos y clientes; los envíos esperan al worker.
              </Text>
            )}
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Padrón de clientes</Text>
            <View style={styles.summaryRow}>
              <SummaryMetric label="Activos (6m)" value={summary?.totalActivos6m ?? 0} color="#2563eb" />
              <SummaryMetric label="Con teléfono" value={summary?.activosConTelefono ?? 0} color="#10B981" />
              <SummaryMetric label="Pendientes" value={summary?.activosSinTelefono ?? 0} color="#F59E0B" />
            </View>
            <Text style={styles.summaryHint}>
              {summary?.totalClientes ?? 0} clientes totales · {summary?.localidadesDisponibles?.length ?? 0} localidades
            </Text>
          </View>

          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Grupos de difusión</Text>
            <TouchableOpacity style={styles.newGroupButton} onPress={() => navigation.navigate('WhatsappGroupForm', {})}>
              <Icon name="plus" size={16} color="#fff" />
              <Text style={styles.newGroupText}>Nuevo grupo</Text>
            </TouchableOpacity>
          </View>

          {groups.length === 0 && (
            <View style={styles.emptyCard}>
              <Icon name="users" size={42} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Todavía no hay grupos</Text>
              <Text style={styles.emptyText}>Creá el Grupo A con sus días, hora y mensaje para empezar.</Text>
            </View>
          )}

          {groups.map((group) => (
            <View key={String(group._id)} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.groupName}>{group.nombre}</Text>
                  <Text style={styles.groupSchedule}>{formatSchedule(group)}</Text>
                </View>
                <Switch
                  value={group.activo !== false}
                  onValueChange={(value) => toggleGroup(group, value)}
                  trackColor={{ false: '#ddd', true: '#A7F3D0' }}
                  thumbColor={(group.activo !== false) ? WA_GREEN : '#f4f3f4'}
                />
              </View>

              <View style={styles.groupCounts}>
                <Text style={styles.groupCountsText}>
                  {group.totalClientes} cliente(s) · {group.clientesConTelefono} con teléfono
                </Text>
                <Text style={styles.groupLastSend}>{lastSendLabel(group)}</Text>
              </View>

              <View style={styles.groupActions}>
                <TouchableOpacity
                  style={styles.groupAction}
                  onPress={() => navigation.navigate('WhatsappGroupClients', {
                    groupId: group._id,
                    groupName: group.nombre
                  })}
                >
                  <Icon name="users" size={15} color={HEADER_BLUE} />
                  <Text style={styles.groupActionText}>Clientes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.groupAction}
                  onPress={() => navigation.navigate('WhatsappGroupForm', {
                    groupId: group._id,
                    groupName: group.nombre
                  })}
                >
                  <Icon name="edit-2" size={15} color={HEADER_BLUE} />
                  <Text style={styles.groupActionText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.groupAction, styles.sendAction]}
                  onPress={() => sendNow(group)}
                >
                  <Icon name="send" size={15} color="#fff" />
                  <Text style={styles.sendActionText}>Enviar ahora</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

function SummaryMetric ({ label, value, color }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  )
}

function formatSchedule (group) {
  const days = DAY_ORDER
    .filter((day) => Array.isArray(group.diasSemana) && group.diasSemana.includes(day))
    .map((day) => DAY_LABELS[day])
    .join(', ')
  return `${days || 'Sin días'} · ${group.hora || '--:--'} hs`
}

function lastSendLabel (group) {
  const dateValue = group.ultimoEnvioAt || group.ultimoEnvioFecha
  if (!dateValue) {
    return 'Sin envíos todavía'
  }
  const dateLabel = group.ultimoEnvioAt ? formatShortDate(group.ultimoEnvioAt) : group.ultimoEnvioFecha
  const result = group.ultimoResultado
  if (result && typeof result === 'object') {
    return `Último envío ${dateLabel}: ${result.enviados ?? 0} enviados · ${result.fallidos ?? 0} fallidos · ${result.omitidosSinTelefono ?? 0} sin teléfono`
  }
  return `Último envío: ${dateLabel}`
}

function formatShortDate (value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10)
  }
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function errorMessage (error) {
  return error?.response?.data?.error || error?.response?.data || error?.message || 'Ocurrió un error'
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerContainer: {
    backgroundColor: HEADER_BLUE,
    paddingTop: 40,
    paddingBottom: 18,
    paddingHorizontal: 15,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, marginHorizontal: 4 },
  headerTitle: { color: '#fff', fontSize: 19, fontFamily: 'Cairo-Bold' },
  headerSubtitle: { color: '#dbeafe', fontSize: 13, fontFamily: 'Cairo-Regular' },
  body: { padding: 14, paddingBottom: 40 },
  statusBanner: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4
  },
  statusLine: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusText: { fontFamily: 'Cairo-Bold', color: '#111827', fontSize: 13 },
  statusSeparator: { marginHorizontal: 6, color: '#9CA3AF' },
  automationText: { marginTop: 6, fontFamily: 'Cairo-Bold', fontSize: 12 },
  statusHint: { marginTop: 6, color: '#B45309', fontSize: 12 },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4
  },
  cardTitle: { fontFamily: 'Cairo-Bold', color: '#111827', fontSize: 15, marginBottom: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: { fontFamily: 'Cairo-Bold', fontSize: 22 },
  metricLabel: { color: '#6B7280', fontSize: 11, marginTop: 2 },
  summaryHint: { color: '#9CA3AF', fontSize: 11, marginTop: 8, textAlign: 'center' },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  listTitle: { fontFamily: 'Cairo-Bold', fontSize: 15, color: '#111827' },
  newGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: WA_GREEN,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  newGroupText: { color: '#fff', fontFamily: 'Cairo-Bold', fontSize: 12 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 14, padding: 24, alignItems: 'center' },
  emptyTitle: { fontFamily: 'Cairo-Bold', color: '#374151', marginTop: 10 },
  emptyText: { color: '#9CA3AF', fontSize: 12, marginTop: 4, textAlign: 'center' },
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4
  },
  groupHeader: { flexDirection: 'row', alignItems: 'center' },
  groupName: { fontFamily: 'Cairo-Bold', fontSize: 16, color: '#111827' },
  groupSchedule: { color: HEADER_BLUE, fontSize: 12, marginTop: 2, fontFamily: 'Cairo-Regular' },
  groupCounts: { marginTop: 10 },
  groupCountsText: { color: '#374151', fontSize: 12 },
  groupLastSend: { color: '#9CA3AF', fontSize: 11, marginTop: 2 },
  groupActions: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8, flexWrap: 'wrap' },
  groupAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  groupActionText: { color: HEADER_BLUE, fontSize: 12, fontFamily: 'Cairo-Bold' },
  sendAction: { backgroundColor: WA_GREEN, borderColor: WA_GREEN, marginLeft: 'auto' },
  sendActionText: { color: '#fff', fontSize: 12, fontFamily: 'Cairo-Bold' }
})
