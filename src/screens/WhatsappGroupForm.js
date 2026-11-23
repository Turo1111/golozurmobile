import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
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
import { createGroup, deleteGroup, getGroup, updateGroup } from '../services/whatsappApi'

const HEADER_BLUE = '#2563eb'
const WA_GREEN = '#25D366'
const HORA_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
const SAMPLE_NAME = 'Kiosco San Martín'

const DAYS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' }
]

export default function WhatsappGroupForm ({ navigation, route }) {
  const { isAdmin } = useRequireAdmin(navigation)
  const groupId = route.params?.groupId || null
  const isEditing = groupId !== null

  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [nombre, setNombre] = useState(route.params?.groupName || '')
  const [descripcion, setDescripcion] = useState('')
  const [diasSemana, setDiasSemana] = useState([])
  const [hora, setHora] = useState('10:00')
  const [mensaje, setMensaje] = useState('Hola {{nombre}}, ¿necesitás realizar un pedido?')
  const [activo, setActivo] = useState(true)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    if (groupId === null) {
      return () => { mounted.current = false }
    }

    setLoading(true)
    getGroup(groupId)
      .then(({ data }) => {
        if (!mounted.current) {
          return
        }
        setNombre(data?.nombre || '')
        setDescripcion(data?.descripcion || '')
        setDiasSemana(Array.isArray(data?.diasSemana) ? data.diasSemana : [])
        setHora(data?.hora || '10:00')
        setMensaje(data?.mensaje || '')
        setActivo(data?.activo !== false)
      })
      .catch((error) => {
        if (mounted.current) {
          Alert.alert('No se pudo cargar el grupo', errorMessage(error))
        }
      })
      .finally(() => {
        if (mounted.current) {
          setLoading(false)
        }
      })

    return () => { mounted.current = false }
  }, [groupId])

  const toggleDay = (day) => {
    setDiasSemana((previous) => (
      previous.includes(day)
        ? previous.filter((value) => value !== day)
        : [...previous, day].sort((left, right) => left - right)
    ))
  }

  const insertNameMarker = () => {
    setMensaje((previous) => `${previous}{{nombre}}`)
  }

  const save = async () => {
    if (nombre.trim() === '') {
      Alert.alert('Falta el nombre', 'Escribí un nombre para el grupo, por ejemplo Grupo A.')
      return
    }
    if (diasSemana.length === 0) {
      Alert.alert('Faltan los días', 'Elegí al menos un día de envío.')
      return
    }
    if (!HORA_PATTERN.test(hora.trim())) {
      Alert.alert('Hora inválida', 'Usá el formato HH:mm en 24 horas, por ejemplo 10:00.')
      return
    }
    if (mensaje.trim() === '') {
      Alert.alert('Falta el mensaje', 'Escribí el texto que se enviará al grupo.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        diasSemana,
        hora: hora.trim(),
        mensaje: mensaje.trim(),
        activo
      }
      if (isEditing) {
        await updateGroup(groupId, payload)
      } else {
        await createGroup(payload)
      }
      Alert.alert('Guardado', `El grupo ${payload.nombre} fue guardado.`)
      navigation.goBack()
    } catch (error) {
      Alert.alert('No se pudo guardar el grupo', errorMessage(error))
    } finally {
      if (mounted.current) {
        setSaving(false)
      }
    }
  }

  const confirmDelete = () => {
    Alert.alert(
      `Eliminar ${nombre || 'grupo'}`,
      'El grupo y su agenda se eliminan. Los clientes no se borran.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true)
            try {
              await deleteGroup(groupId)
              navigation.goBack()
            } catch (error) {
              Alert.alert('No se pudo eliminar', errorMessage(error))
            } finally {
              if (mounted.current) {
                setDeleting(false)
              }
            }
          }
        }
      ]
    )
  }

  if (!isAdmin) {
    return null
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={HEADER_BLUE} />
      </View>
    )
  }

  const preview = mensaje.trim() === ''
    ? 'La vista previa aparece cuando escribís el mensaje.'
    : mensaje.replace(/{{\s*nombre\s*}}/gi, SAMPLE_NAME)

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Icon name="arrow-left" size={18} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{isEditing ? 'Editar grupo' : 'Nuevo grupo'}</Text>
            <Text style={styles.headerSubtitle}>Días, hora y mensaje de difusión</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Nombre del grupo</Text>
          <TextInput
            style={styles.input}
            value={nombre}
            onChangeText={setNombre}
            placeholder="Grupo A"
          />

          <Text style={styles.fieldLabel}>Descripción (opcional)</Text>
          <TextInput
            style={styles.input}
            value={descripcion}
            onChangeText={setDescripcion}
            placeholder="Ruta lunes y jueves"
          />

          <Text style={styles.fieldLabel}>Días de envío</Text>
          <View style={styles.daysRow}>
            {DAYS.map((day) => {
              const selected = diasSemana.includes(day.value)
              return (
                <TouchableOpacity
                  key={day.value}
                  style={[styles.dayChip, selected && styles.dayChipSelected]}
                  onPress={() => toggleDay(day.value)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                >
                  <Text style={[styles.dayChipText, selected && styles.dayChipTextSelected]}>{day.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <Text style={styles.fieldLabel}>Hora de envío (HH:mm)</Text>
          <TextInput
            style={styles.input}
            value={hora}
            onChangeText={setHora}
            placeholder="10:00"
            keyboardType="numbers-and-punctuation"
          />
          <Text style={styles.helperText}>Hora local de Argentina (America/Argentina/Tucuman).</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.messageHeader}>
            <Text style={styles.fieldLabel}>Cuerpo del mensaje</Text>
            <TouchableOpacity style={styles.markerButton} onPress={insertNameMarker}>
              <Icon name="code" size={13} color={HEADER_BLUE} />
              <Text style={styles.markerButtonText}>Insertar {'{{nombre}}'}</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={mensaje}
            onChangeText={setMensaje}
            multiline
            placeholder="Hola {{nombre}}, ¿necesitás realizar un pedido?"
          />

          <Text style={styles.fieldLabel}>Vista previa</Text>
          <View style={styles.previewBox}>
            <Text style={styles.previewText}>{preview}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Grupo activo</Text>
              <Text style={styles.helperText}>Solo los grupos activos se disparan en su día y hora.</Text>
            </View>
            <Switch
              value={activo}
              onValueChange={setActivo}
              trackColor={{ false: '#ddd', true: '#A7F3D0' }}
              thumbColor={activo ? WA_GREEN : '#f4f3f4'}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, saving && styles.buttonDisabled]}
          onPress={save}
          disabled={saving}
        >
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="save" size={16} color="#fff" />}
          <Text style={styles.primaryButtonText}>{saving ? 'Guardando...' : 'Guardar grupo'}</Text>
        </TouchableOpacity>

        {isEditing && (
          <TouchableOpacity
            style={[styles.deleteButton, deleting && styles.buttonDisabled]}
            onPress={confirmDelete}
            disabled={deleting}
          >
            <Icon name="trash-2" size={16} color="#EF4444" />
            <Text style={styles.deleteButtonText}>{deleting ? 'Eliminando...' : 'Eliminar grupo'}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  )
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
  iconButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, marginRight: 10 },
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
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  helperText: { color: '#9CA3AF', fontSize: 11, marginTop: 4 },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayChip: {
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#fff'
  },
  dayChipSelected: { backgroundColor: HEADER_BLUE, borderColor: HEADER_BLUE },
  dayChipText: { color: HEADER_BLUE, fontFamily: 'Cairo-Bold', fontSize: 12 },
  dayChipTextSelected: { color: '#fff' },
  messageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  markerButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  markerButtonText: { color: HEADER_BLUE, fontSize: 11, fontFamily: 'Cairo-Bold' },
  previewBox: { backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#BBF7D0' },
  previewText: { color: '#166534', fontSize: 13, lineHeight: 19 },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  primaryButton: {
    backgroundColor: HEADER_BLUE,
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12
  },
  primaryButtonText: { color: '#fff', fontFamily: 'Cairo-Bold', fontSize: 15 },
  buttonDisabled: { opacity: 0.6 },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12
  },
  deleteButtonText: { color: '#EF4444', fontFamily: 'Cairo-Bold', fontSize: 13 }
})
