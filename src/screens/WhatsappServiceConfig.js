import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import Icon from 'react-native-vector-icons/Feather'
import useRequireAdmin from '../hooks/useRequireAdmin'
import {
  getServiceState,
  sendServiceCommand,
  updateServiceConfig
} from '../services/whatsappApi'
import { normalizeArgentineMobile } from '../utils/phone'

const HEADER_BLUE = '#2563eb'
const POLL_MS = 3000

const SESSION_META = {
  ready: { label: 'Vinculada', color: '#10B981', background: '#ECFDF5', icon: 'check-circle' },
  connecting: { label: 'Vinculando', color: '#F59E0B', background: '#FFFBEB', icon: 'loader' },
  unlinked: { label: 'Sin vincular', color: '#EF4444', background: '#FEF2F2', icon: 'alert-circle' },
  paused: { label: 'En pausa', color: '#EF4444', background: '#FEF2F2', icon: 'pause-circle' }
}

const COMMAND_LABELS = {
  renew_session: 'Generar código nuevo',
  send_test: 'Mensaje de prueba',
  send_group_now: 'Envío manual de grupo',
  stop_current_run: 'Detener tanda'
}

export default function WhatsappServiceConfig ({ navigation }) {
  const { isAdmin } = useRequireAdmin(navigation)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [state, setState] = useState(null)
  const [automationEnabled, setAutomationEnabled] = useState(true)
  const [delay, setDelay] = useState('10')
  const [catchUp, setCatchUp] = useState('3')
  const [workerUrl, setWorkerUrl] = useState('')
  const [testPhone, setTestPhone] = useState('')
  const [testMessage, setTestMessage] = useState('Mensaje de prueba de Golozur')
  const [sendingTest, setSendingTest] = useState(false)
  const mounted = useRef(true)
  const inFlight = useRef(false)

  const loadState = useCallback(async ({ syncForm = false } = {}) => {
    if (inFlight.current) {
      return
    }
    inFlight.current = true
    try {
      const { data } = await getServiceState()
      if (!mounted.current) {
        return
      }
      setState(data)
      if (syncForm) {
        setAutomationEnabled(data?.config?.automationEnabled !== false)
        setDelay(String(data?.config?.delayBetweenMessagesSeconds ?? 10))
        setCatchUp(String(data?.config?.catchUpWindowHours ?? 3))
        setWorkerUrl(data?.config?.workerUrlOverride || '')
      }
    } catch (error) {
      if (syncForm && mounted.current) {
        Alert.alert('No se pudo consultar el servicio', errorMessage(error))
      }
    } finally {
      inFlight.current = false
      if (mounted.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    loadState({ syncForm: true })
    const timer = setInterval(() => { loadState() }, POLL_MS)
    return () => {
      mounted.current = false
      clearInterval(timer)
    }
  }, [loadState])

  const saveConfig = async () => {
    const delayValue = Number(delay)
    const catchUpValue = Number(catchUp)
    if (!Number.isInteger(delayValue) || delayValue < 5 || delayValue > 120) {
      Alert.alert('Pausa inválida', 'La pausa entre mensajes debe ser un entero entre 5 y 120 segundos.')
      return
    }
    if (!Number.isInteger(catchUpValue) || catchUpValue < 1 || catchUpValue > 12) {
      Alert.alert('Ventana inválida', 'La ventana de recuperación debe ser un entero entre 1 y 12 horas.')
      return
    }

    setSaving(true)
    try {
      await updateServiceConfig({
        automationEnabled,
        delayBetweenMessagesSeconds: delayValue,
        catchUpWindowHours: catchUpValue,
        workerUrlOverride: workerUrl.trim() === '' ? null : workerUrl.trim()
      })
      await loadState({ syncForm: true })
      Alert.alert('Guardado', 'La configuración del servicio fue actualizada.')
    } catch (error) {
      Alert.alert('No se pudo guardar', errorMessage(error))
    } finally {
      if (mounted.current) {
        setSaving(false)
      }
    }
  }

  const renewSession = async () => {
    try {
      await sendServiceCommand('renew_session')
      Alert.alert('Código solicitado', 'El worker generará un QR/código nuevo en el próximo ciclo de sincronización.')
      await loadState()
    } catch (error) {
      Alert.alert('No se pudo solicitar el código', errorMessage(error))
    }
  }

  const sendTest = async () => {
    const normalized = normalizeArgentineMobile(testPhone)
    if (!normalized.ok) {
      Alert.alert('Teléfono inválido', normalized.error)
      return
    }
    if (testMessage.trim() === '') {
      Alert.alert('Mensaje vacío', 'Escribí el texto del mensaje de prueba.')
      return
    }

    setSendingTest(true)
    try {
      await sendServiceCommand('send_test', { phone: normalized.value, message: testMessage.trim() })
      Alert.alert('Prueba encolada', 'El worker la enviará cuando sincronice con gzapi.')
      await loadState()
    } catch (error) {
      Alert.alert('No se pudo encolar la prueba', errorMessage(error))
    } finally {
      if (mounted.current) {
        setSendingTest(false)
      }
    }
  }

  if (!isAdmin) {
    return null
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={HEADER_BLUE} />
        <Text style={styles.loadingText}>Consultando el microservicio...</Text>
      </View>
    )
  }

  const workerStatus = state?.workerStatus || {}
  const session = workerStatus.session || 'unlinked'
  const sessionMeta = SESSION_META[session] || SESSION_META.unlinked
  const workerOnline = state?.workerOnline === true
  const qr = typeof workerStatus.qr === 'string' && workerStatus.qr.startsWith('data:image') ? workerStatus.qr : null
  const pairingCode = workerStatus.pairingCode
  const commands = Array.isArray(state?.commands) ? state.commands.slice(0, 5) : []

  const copyPairingCode = () => {
    if (typeof pairingCode !== 'string' || pairingCode === '') {
      return
    }
    Clipboard.setString(pairingCode)
    Alert.alert('Copiado', 'Código copiado al portapapeles.')
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={18} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Configuración del servicio</Text>
            <Text style={styles.headerSubtitle}>WhatsApp Automatizado</Text>
          </View>
          <TouchableOpacity onPress={() => loadState({ syncForm: true })} style={styles.backButton}>
            <Icon name="refresh-cw" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="wifi" size={18} color={HEADER_BLUE} />
            <Text style={styles.cardTitle}>Estado del microservicio</Text>
          </View>

          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: workerOnline ? '#10B981' : '#EF4444' }]} />
            <Text style={styles.statusText}>{workerOnline ? 'Worker online' : 'Worker sin conexión'}</Text>
          </View>

          <View style={[styles.sessionBadge, { backgroundColor: sessionMeta.background }]}>
            <Icon name={sessionMeta.icon} size={16} color={sessionMeta.color} />
            <Text style={[styles.sessionText, { color: sessionMeta.color }]}>
              Sesión: {sessionMeta.label}
            </Text>
          </View>

          <InfoRow label="Número emisor" value={workerStatus.sender || 'Sin vincular (solo lectura)'} />
          <InfoRow
            label="Último latido"
            value={workerStatus.lastHeartbeatAt ? formatDateTime(workerStatus.lastHeartbeatAt) : 'Nunca'}
          />
          {!!workerStatus.lastError && <InfoRow label="Último error" value={workerStatus.lastError} danger />}

          {!workerOnline && (
            <Text style={styles.warningText}>
              El worker no responde. Podés seguir creando y editando grupos y clientes: los datos quedan en gzapi.
            </Text>
          )}

          {session !== 'ready' && (
            <View style={styles.qrBox}>
              {!!qr && <Image source={{ uri: qr }} style={styles.qrImage} resizeMode="contain" />}
              {!!pairingCode && (
                <View style={styles.pairingRow}>
                  <Text style={styles.pairingCode}>Código: {pairingCode}</Text>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={copyPairingCode}
                    accessibilityRole="button"
                    accessibilityLabel="Copiar código de emparejamiento"
                  >
                    <Icon name="copy" size={18} color={HEADER_BLUE} />
                  </TouchableOpacity>
                </View>
              )}
              {!qr && !pairingCode && (
                <Text style={styles.helperText}>
                  El worker todavía no publicó un QR. Si está apagado, encendelo y esperá el próximo latido.
                </Text>
              )}
              <TouchableOpacity style={styles.secondaryButton} onPress={renewSession}>
                <Icon name="refresh-ccw" size={16} color={HEADER_BLUE} />
                <Text style={styles.secondaryButtonText}>Generar código nuevo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="sliders" size={18} color={HEADER_BLUE} />
            <Text style={styles.cardTitle}>Parámetros operativos</Text>
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Automatización general activa</Text>
              <Text style={styles.helperText}>Si está pausada, no se ejecutan tandas programadas ni manuales.</Text>
            </View>
            <Switch
              value={automationEnabled}
              onValueChange={setAutomationEnabled}
              trackColor={{ false: '#ddd', true: '#93C5FD' }}
              thumbColor={automationEnabled ? HEADER_BLUE : '#f4f3f4'}
            />
          </View>

          <Text style={styles.fieldLabel}>Pausa entre mensajes (segundos)</Text>
          <TextInput
            style={styles.input}
            value={delay}
            onChangeText={setDelay}
            keyboardType="numeric"
            placeholder="10"
          />

          <Text style={styles.fieldLabel}>Ventana de recuperación (horas)</Text>
          <TextInput
            style={styles.input}
            value={catchUp}
            onChangeText={setCatchUp}
            keyboardType="numeric"
            placeholder="3"
          />

          <Text style={styles.fieldLabel}>URL local del worker (opcional, diagnóstico)</Text>
          <TextInput
            style={styles.input}
            value={workerUrl}
            onChangeText={setWorkerUrl}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="http://192.168.0.10:3210"
          />

          <TouchableOpacity style={[styles.primaryButton, saving && styles.buttonDisabled]} onPress={saveConfig} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="save" size={16} color="#fff" />}
            <Text style={styles.primaryButtonText}>{saving ? 'Guardando...' : 'Guardar configuración'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="send" size={18} color={HEADER_BLUE} />
            <Text style={styles.cardTitle}>Mensaje de prueba</Text>
          </View>

          <Text style={styles.fieldLabel}>Teléfono destino</Text>
          <TextInput
            style={styles.input}
            value={testPhone}
            onChangeText={setTestPhone}
            keyboardType="phone-pad"
            placeholder="3816041154"
          />

          <Text style={styles.fieldLabel}>Texto</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={testMessage}
            onChangeText={setTestMessage}
            multiline
            placeholder="Mensaje de prueba de Golozur"
          />

          <TouchableOpacity
            style={[styles.primaryButton, sendingTest && styles.buttonDisabled]}
            onPress={sendTest}
            disabled={sendingTest}
          >
            {sendingTest ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="zap" size={16} color="#fff" />}
            <Text style={styles.primaryButtonText}>{sendingTest ? 'Enviando...' : 'Enviar prueba ahora'}</Text>
          </TouchableOpacity>
        </View>

        {commands.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="clock" size={18} color={HEADER_BLUE} />
              <Text style={styles.cardTitle}>Últimos comandos</Text>
            </View>
            {commands.map((command) => (
              <View key={String(command._id)} style={styles.commandRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.commandTitle}>{COMMAND_LABELS[command.type] || command.type}</Text>
                  <Text style={styles.helperText}>{formatDateTime(command.createdAt)}</Text>
                </View>
                <Text style={[styles.commandStatus, statusColor(command.status)]}>
                  {commandStatusLabel(command.status)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

function InfoRow ({ label, value, danger = false }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, danger && { color: '#EF4444' }]} numberOfLines={2}>{value}</Text>
    </View>
  )
}

function errorMessage (error) {
  return error?.response?.data?.error || error?.response?.data || error?.message || 'Ocurrió un error'
}

function formatDateTime (value) {
  if (!value) {
    return '—'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  return date.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

function statusColor (status) {
  if (status === 'completed') return { color: '#10B981' }
  if (status === 'failed') return { color: '#EF4444' }
  if (status === 'processing') return { color: '#F59E0B' }
  return { color: '#6B7280' }
}

function commandStatusLabel (status) {
  if (status === 'completed') return 'Completado'
  if (status === 'failed') return 'Falló'
  if (status === 'processing') return 'En proceso'
  return 'Pendiente'
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f9' },
  loadingText: { marginTop: 10, color: '#6B7280' },
  headerContainer: {
    backgroundColor: HEADER_BLUE,
    paddingTop: 40,
    paddingBottom: 18,
    paddingHorizontal: 15,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    marginRight: 10
  },
  headerTitle: { color: '#fff', fontSize: 19, fontFamily: 'Cairo-Bold' },
  headerSubtitle: { color: '#dbeafe', fontSize: 13, fontFamily: 'Cairo-Regular' },
  body: { padding: 14, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle: { marginLeft: 8, fontSize: 15, fontFamily: 'Cairo-Bold', color: '#111827' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusText: { fontFamily: 'Cairo-Bold', color: '#111827' },
  sessionBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8
  },
  sessionText: { fontFamily: 'Cairo-Bold', fontSize: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoLabel: { color: '#6B7280', fontSize: 13 },
  infoValue: { color: '#111827', fontSize: 13, flex: 1, textAlign: 'right', marginLeft: 12 },
  warningText: { color: '#B45309', backgroundColor: '#FFFBEB', padding: 10, borderRadius: 8, fontSize: 12, marginTop: 8 },
  qrBox: { alignItems: 'center', marginTop: 10 },
  qrImage: { width: 220, height: 220, backgroundColor: '#fff' },
  pairingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  pairingCode: { fontFamily: 'Cairo-Bold', fontSize: 18, letterSpacing: 2, color: '#111827' },
  copyButton: { padding: 8, borderRadius: 8, backgroundColor: '#EFF6FF' },
  helperText: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  secondaryButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: HEADER_BLUE,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  secondaryButtonText: { color: HEADER_BLUE, fontFamily: 'Cairo-Bold' },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  fieldLabel: { color: '#374151', fontFamily: 'Cairo-Bold', fontSize: 13, marginTop: 10, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff'
  },
  multiline: { minHeight: 84, textAlignVertical: 'top' },
  primaryButton: {
    marginTop: 16,
    backgroundColor: HEADER_BLUE,
    borderRadius: 10,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  primaryButtonText: { color: '#fff', fontFamily: 'Cairo-Bold' },
  buttonDisabled: { opacity: 0.6 },
  commandRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  commandTitle: { color: '#111827', fontFamily: 'Cairo-Bold', fontSize: 13 },
  commandStatus: { fontFamily: 'Cairo-Bold', fontSize: 12 }
})
