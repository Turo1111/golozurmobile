import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import Icon from 'react-native-vector-icons/Feather'
import useRequireAdmin from '../hooks/useRequireAdmin'
import {
  backfillRegions,
  getGroup,
  getWhatsappClients,
  setGroupClients,
  updateClientPhones
} from '../services/whatsappApi'
import { nationalPhoneNumber, normalizeArgentineMobile } from '../utils/phone'

const HEADER_BLUE = '#2563eb'
const WA_GREEN = '#25D366'

const ACTIVE_FILTERS = [
  { value: 'activos', label: 'Activos (6m)' },
  { value: 'todos', label: 'Todos' }
]

const PHONE_FILTERS = [
  { value: 'todos', label: 'Todos' },
  { value: 'con', label: 'Con teléfono' },
  { value: 'sin', label: 'Sin teléfono' }
]

export default function WhatsappGroupClients ({ navigation, route }) {
  const { isAdmin } = useRequireAdmin(navigation)
  const groupId = route.params?.groupId
  const groupName = route.params?.groupName || 'Grupo'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [clients, setClients] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [localidades, setLocalidades] = useState([])
  const [summary, setSummary] = useState(null)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('activos')
  const [phoneFilter, setPhoneFilter] = useState('todos')
  const [localidad, setLocalidad] = useState('todas')

  const [modalClient, setModalClient] = useState(null)
  const [modalPhones, setModalPhones] = useState([])
  const [modalActive, setModalActive] = useState(null)
  const [modalInput, setModalInput] = useState('')
  const [modalError, setModalError] = useState('')
  const [modalSaving, setModalSaving] = useState(false)

  const mounted = useRef(true)
  const initialized = useRef(false)

  const loadData = useCallback(async () => {
    try {
      const [groupResponse, clientsResponse] = await Promise.all([
        getGroup(groupId),
        getWhatsappClients({ limit: 1000 })
      ])
      if (!mounted.current) {
        return
      }

      const group = groupResponse.data
      const memberIds = new Set((group?.clientes || []).map((client) => String(client._id)))
      setClients(Array.isArray(clientsResponse.data?.items) ? clientsResponse.data.items : [])
      setLocalidades(Array.isArray(clientsResponse.data?.summary?.localidadesDisponibles)
        ? clientsResponse.data.summary.localidadesDisponibles
        : [])
      setSummary(clientsResponse.data?.summary || null)

      if (!initialized.current) {
        initialized.current = true
        setSelected(memberIds)
      } else {
        setSelected((previous) => new Set(previous))
      }
    } catch (error) {
      if (mounted.current) {
        Alert.alert('No se pudo cargar el grupo', errorMessage(error))
      }
    } finally {
      if (mounted.current) {
        setLoading(false)
      }
    }
  }, [groupId])

  useEffect(() => {
    mounted.current = true
    loadData()
    return () => { mounted.current = false }
  }, [loadData])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const digits = term.replace(/\D/g, '')

    return clients.filter((client) => {
      if (activeFilter === 'activos' && client.activoUltimos6Meses !== true) {
        return false
      }
      if (phoneFilter === 'con' && client.telefonoActivo === null) {
        return false
      }
      if (phoneFilter === 'sin' && client.telefonoActivo !== null) {
        return false
      }
      if (localidad !== 'todas') {
        if (localidad === '__sin__') {
          if (client.localidad) {
            return false
          }
        } else if ((client.localidad || '').toLowerCase() !== localidad.toLowerCase()) {
          return false
        }
      }
      if (term !== '') {
        const nameMatches = (client.nombreCompleto || '').toLowerCase().includes(term)
        const phones = [...(client.telefonos || []), client.telefonoActivo]
          .filter(Boolean)
          .join('')
          .replace(/\D/g, '')
        const phoneMatches = digits !== '' && phones.includes(digits)
        if (!nameMatches && !phoneMatches) {
          return false
        }
      }
      return true
    })
  }, [activeFilter, clients, localidad, phoneFilter, search])

  const selectedClients = useMemo(
    () => clients.filter((client) => selected.has(String(client._id))),
    [clients, selected]
  )
  const readyCount = selectedClients.filter((client) => client.telefonoActivo).length

  const toggleClient = (id) => {
    setSelected((previous) => {
      const next = new Set(previous)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectFiltered = () => {
    setSelected((previous) => {
      const next = new Set(previous)
      filtered.forEach((client) => next.add(String(client._id)))
      return next
    })
  }

  const clearFiltered = () => {
    setSelected((previous) => {
      const next = new Set(previous)
      filtered.forEach((client) => next.delete(String(client._id)))
      return next
    })
  }

  const saveSelection = async () => {
    setSaving(true)
    try {
      await setGroupClients(groupId, [...selected], 'replace')
      Alert.alert('Guardado', `${selected.size} cliente(s) quedaron asignados a ${groupName}.`)
      navigation.goBack()
    } catch (error) {
      Alert.alert('No se pudo guardar la selección', errorMessage(error))
    } finally {
      if (mounted.current) {
        setSaving(false)
      }
    }
  }

  const runBackfill = async () => {
    setBackfilling(true)
    try {
      const { data } = await backfillRegions({ limit: 25 })
      Alert.alert(
        'Regiones actualizadas',
        `Actualizados: ${data?.updated ?? 0}. Por dirección: ${data?.regionsFromAddress ?? 0}. Por cercanía: ${data?.fromNeighbor ?? 0}. Por GPS: ${data?.fromNominatim ?? 0}. Quedan ${data?.remaining ?? 0} sin localidad.`
      )
      await loadData()
    } catch (error) {
      Alert.alert('No se pudo completar el backfill', errorMessage(error))
    } finally {
      if (mounted.current) {
        setBackfilling(false)
      }
    }
  }

  const openPhoneModal = (client) => {
    const phones = Array.isArray(client.telefonos)
      ? [...new Set(client.telefonos.map(Number).filter((value) => Number.isFinite(value)))]
      : []
    let active = typeof client.telefonoActivo === 'string' && client.telefonoActivo !== ''
      ? client.telefonoActivo
      : null
    if (active === null && phones.length === 1) {
      const normalized = normalizeArgentineMobile(phones[0])
      active = normalized.ok ? normalized.value : null
    }
    setModalClient(client)
    setModalPhones(phones)
    setModalActive(active)
    setModalInput('')
    setModalError('')
  }

  const closePhoneModal = () => {
    if (modalSaving) {
      return
    }
    setModalClient(null)
    setModalError('')
  }

  const addModalPhone = () => {
    const raw = modalInput.trim()
    if (raw === '') {
      return
    }
    const normalized = normalizeArgentineMobile(raw)
    if (!normalized.ok) {
      setModalError(normalized.error)
      return
    }
    const numeric = nationalPhoneNumber(normalized.value)
    if (numeric === null) {
      setModalError(`"${raw}" no es un móvil argentino válido.`)
      return
    }
    setModalPhones((previous) => previous.includes(numeric) ? previous : [...previous, numeric])
    setModalActive((previous) => previous || normalized.value)
    setModalInput('')
    setModalError('')
  }

  const removeModalPhone = (index) => {
    const removed = modalPhones[index]
    const next = modalPhones.filter((_, position) => position !== index)
    let nextActive = modalActive
    if (removed !== undefined && nextActive !== null) {
      const normalized = normalizeArgentineMobile(removed)
      if (normalized.ok && normalized.value === nextActive) {
        nextActive = next.length > 0 ? normalizeArgentineMobile(next[0]).value ?? null : null
      }
    }
    if (next.length === 0) {
      nextActive = null
    }
    setModalPhones(next)
    setModalActive(nextActive)
  }

  const savePhones = async () => {
    const phones = [...modalPhones]
    let active = modalActive

    if (modalInput.trim() !== '') {
      const normalized = normalizeArgentineMobile(modalInput)
      if (!normalized.ok) {
        setModalError(normalized.error)
        return
      }
      const numeric = nationalPhoneNumber(normalized.value)
      if (numeric !== null && !phones.includes(numeric)) {
        phones.push(numeric)
      }
      if (active === null) {
        active = normalized.value
      }
    }

    if (phones.length > 0 && active === null) {
      const first = normalizeArgentineMobile(phones[0])
      active = first.ok ? first.value : null
    }

    setModalSaving(true)
    try {
      await updateClientPhones(modalClient._id, { telefonos: phones, telefonoActivo: active })
      setClients((previous) => previous.map((client) => (
        String(client._id) === String(modalClient._id)
          ? { ...client, telefonos: phones, telefonoActivo: active }
          : client
      )))
      setModalClient(null)
      setModalError('')
    } catch (error) {
      setModalError(errorMessage(error))
    } finally {
      if (mounted.current) {
        setModalSaving(false)
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
        <Text style={styles.loadingText}>Cargando padrón filtrable...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Icon name="arrow-left" size={18} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{groupName}</Text>
            <Text style={styles.headerSubtitle}>Clientes del grupo</Text>
          </View>
        </View>
      </View>

      <View style={styles.filters}>
        <View style={styles.searchBar}>
          <Icon name="search" size={16} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nombre o teléfono..."
            placeholderTextColor="#B0B0B0"
          />
          {search !== '' && (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.clearSearch}>
              <Icon name="x" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {!!summary && (
          <Text style={styles.summaryText}>
            Activos 6m: {summary.totalActivos6m} · Con teléfono: {summary.activosConTelefono} · Pendientes: {summary.activosSinTelefono}
          </Text>
        )}

        <FilterRow label="Actividad" options={ACTIVE_FILTERS} value={activeFilter} onChange={setActiveFilter} />
        <FilterRow label="Teléfono" options={PHONE_FILTERS} value={phoneFilter} onChange={setPhoneFilter} />

        <Text style={styles.filterLabel}>Localidad / Región</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          <Chip label="Todas" selected={localidad === 'todas'} onPress={() => setLocalidad('todas')} />
          <Chip label="Sin localidad" selected={localidad === '__sin__'} onPress={() => setLocalidad('__sin__')} />
          {localidades.map((item) => (
            <Chip
              key={item}
              label={item}
              selected={localidad === item}
              onPress={() => setLocalidad(item)}
            />
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.backfillButton} onPress={runBackfill} disabled={backfilling}>
          {backfilling ? <ActivityIndicator size="small" color={HEADER_BLUE} /> : <Icon name="map-pin" size={14} color={HEADER_BLUE} />}
          <Text style={styles.backfillText}>
            {backfilling ? 'Completando regiones...' : 'Completar regiones por GPS'}
          </Text>
        </TouchableOpacity>

        <View style={styles.bulkRow}>
          <TouchableOpacity style={styles.bulkButton} onPress={selectFiltered}>
            <Text style={styles.bulkButtonText}>Seleccionar filtrados</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bulkButton} onPress={clearFiltered}>
            <Text style={styles.bulkButtonText}>Quitar filtrados</Text>
          </TouchableOpacity>
          <Text style={styles.filteredCount}>{filtered.length}</Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item._id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={(
          <View style={styles.emptyBox}>
            <Icon name="users" size={42} color="#D1D5DB" />
            <Text style={styles.emptyText}>No hay clientes con estos filtros.</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const id = String(item._id)
          const isSelected = selected.has(id)
          const otherGroups = (item.grupos || []).filter((group) => String(group._id) !== String(groupId))

          return (
            <View style={[styles.clientRow, isSelected && styles.clientRowSelected]}>
              <TouchableOpacity
                style={styles.checkButton}
                onPress={() => toggleClient(id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
              >
                <Icon name={isSelected ? 'check-square' : 'square'} size={22} color={isSelected ? WA_GREEN : '#9CA3AF'} />
              </TouchableOpacity>

              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{item.nombreCompleto}</Text>
                <View style={styles.metaRow}>
                  {item.activoUltimos6Meses && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>
                        Activo 6m{item.ultimaVentaAt ? ` · ${formatDate(item.ultimaVentaAt)}` : ''}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.locationText}>{item.localidad || 'Sin localidad'}</Text>
                </View>
                {otherGroups.length > 0 && (
                  <View style={styles.groupChips}>
                    {otherGroups.map((group) => (
                      <Text key={String(group._id)} style={styles.groupChip}>{group.nombre}</Text>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.phoneColumn}>
                <Text style={[styles.phoneText, !item.telefonoActivo && styles.phoneMissing]}>
                  {item.telefonoActivo || 'Sin teléfono'}
                </Text>
                <TouchableOpacity style={styles.phoneButton} onPress={() => openPhoneModal(item)}>
                  <Icon name="phone" size={12} color={HEADER_BLUE} />
                  <Text style={styles.phoneButtonText}>{item.telefonoActivo ? 'Cambiar' : 'Cargar'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        }}
      />

      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Text style={styles.footerCount}>Seleccionados: {selected.size}</Text>
          <Text style={styles.footerReady}>{readyCount} con teléfono activo listos para envío</Text>
        </View>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={saveSelection}
          disabled={saving}
        >
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="save" size={16} color="#fff" />}
          <Text style={styles.saveButtonText}>{saving ? 'Guardando...' : 'Guardar grupo'}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalClient !== null} transparent animationType="slide" onRequestClose={closePhoneModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Teléfonos de {modalClient?.nombreCompleto}</Text>
              <TouchableOpacity onPress={closePhoneModal} style={styles.modalClose}>
                <Icon name="x" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {modalPhones.length === 0 && (
              <Text style={styles.helperText}>Sin teléfonos. Escribí uno y guardá: se marca como activo.</Text>
            )}

            {modalPhones.map((phone, index) => {
              const normalized = normalizeArgentineMobile(phone)
              const display = normalized.ok ? normalized.value : String(phone)
              const isActive = normalized.ok && normalized.value === modalActive
              return (
                <View key={`${phone}-${index}`} style={[styles.modalPhoneRow, isActive && styles.modalPhoneRowActive]}>
                  <TouchableOpacity
                    style={styles.modalPhoneSelect}
                    onPress={() => setModalActive(normalized.ok ? normalized.value : modalActive)}
                  >
                    <Icon name={isActive ? 'check-circle' : 'circle'} size={18} color={isActive ? WA_GREEN : '#9CA3AF'} />
                    <Text style={[styles.modalPhoneText, isActive && styles.modalPhoneActiveText]}>{display}</Text>
                    {isActive && <Text style={styles.modalActiveLabel}>Activo WhatsApp</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeModalPhone(index)} style={styles.modalRemove}>
                    <Icon name="trash-2" size={15} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )
            })}

            <View style={styles.modalInputRow}>
              <TextInput
                style={styles.modalInput}
                value={modalInput}
                onChangeText={(value) => {
                  setModalInput(value)
                  setModalError('')
                }}
                placeholder="Ej. 3816041154"
                keyboardType="phone-pad"
                onSubmitEditing={addModalPhone}
              />
              <TouchableOpacity style={styles.modalAddButton} onPress={addModalPhone}>
                <Icon name="plus" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            {!!modalError && <Text style={styles.modalError}>{modalError}</Text>}

            <TouchableOpacity
              style={[styles.modalSave, modalSaving && styles.buttonDisabled]}
              onPress={savePhones}
              disabled={modalSaving}
            >
              {modalSaving ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="save" size={15} color="#fff" />}
              <Text style={styles.modalSaveText}>{modalSaving ? 'Guardando...' : 'Guardar teléfono'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function FilterRow ({ label, options, value, onChange }) {
  return (
    <View style={styles.filterRow}>
      <Text style={styles.filterLabelInline}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {options.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={value === option.value}
            onPress={() => onChange(option.value)}
          />
        ))}
      </ScrollView>
    </View>
  )
}

function Chip ({ label, selected, onPress }) {
  return (
    <TouchableOpacity style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  )
}

function errorMessage (error) {
  return error?.response?.data?.error || error?.response?.data || error?.message || 'Ocurrió un error'
}

function formatDate (value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f9' },
  loadingText: { marginTop: 10, color: '#6B7280' },
  headerContainer: {
    backgroundColor: HEADER_BLUE,
    paddingTop: 40,
    paddingBottom: 16,
    paddingHorizontal: 15,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, marginRight: 10 },
  headerTitle: { color: '#fff', fontSize: 19, fontFamily: 'Cairo-Bold' },
  headerSubtitle: { color: '#dbeafe', fontSize: 13, fontFamily: 'Cairo-Regular' },
  filters: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 10
  },
  searchInput: { flex: 1, height: 38, fontSize: 14, color: '#111827' },
  clearSearch: { padding: 4 },
  summaryText: { color: '#6B7280', fontSize: 11, marginTop: 6 },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  filterLabel: { color: '#6B7280', fontSize: 11, marginTop: 8 },
  filterLabelInline: { color: '#6B7280', fontSize: 11, width: 62 },
  chipsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#fff'
  },
  chipSelected: { backgroundColor: HEADER_BLUE, borderColor: HEADER_BLUE },
  chipText: { color: HEADER_BLUE, fontSize: 11, fontFamily: 'Cairo-Bold' },
  chipTextSelected: { color: '#fff' },
  backfillButton: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, alignSelf: 'flex-start' },
  backfillText: { color: HEADER_BLUE, fontSize: 11, fontFamily: 'Cairo-Bold' },
  bulkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 },
  bulkButton: { paddingVertical: 4 },
  bulkButtonText: { color: HEADER_BLUE, fontSize: 11, fontFamily: 'Cairo-Bold' },
  filteredCount: { marginLeft: 'auto', color: '#9CA3AF', fontSize: 11 },
  listContent: { padding: 10, paddingBottom: 12 },
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#9CA3AF', marginTop: 8 },
  clientRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#EEF2F7'
  },
  clientRowSelected: { borderColor: '#A7F3D0', backgroundColor: '#F0FDF4' },
  checkButton: { padding: 4, marginRight: 6 },
  clientInfo: { flex: 1 },
  clientName: { fontFamily: 'Cairo-Bold', color: '#111827', fontSize: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 3 },
  activeBadge: { backgroundColor: '#DCFCE7', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  activeBadgeText: { color: '#166534', fontSize: 10, fontFamily: 'Cairo-Bold' },
  locationText: { color: '#6B7280', fontSize: 11 },
  groupChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  groupChip: {
    backgroundColor: '#EFF6FF',
    color: '#1D4ED8',
    fontSize: 10,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden'
  },
  phoneColumn: { alignItems: 'flex-end', marginLeft: 8, maxWidth: 120 },
  phoneText: { color: '#065F46', fontFamily: 'Cairo-Bold', fontSize: 11, textAlign: 'right' },
  phoneMissing: { color: '#9CA3AF', fontFamily: 'Cairo-Regular' },
  phoneButton: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  phoneButtonText: { color: HEADER_BLUE, fontSize: 10, fontFamily: 'Cairo-Bold' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  footerCount: { color: '#111827', fontFamily: 'Cairo-Bold', fontSize: 13 },
  footerReady: { color: '#6B7280', fontSize: 11 },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: WA_GREEN,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  saveButtonText: { color: '#fff', fontFamily: 'Cairo-Bold', fontSize: 13 },
  buttonDisabled: { opacity: 0.6 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    paddingBottom: 28,
    maxHeight: '85%'
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  modalTitle: { flex: 1, fontFamily: 'Cairo-Bold', fontSize: 15, color: '#111827' },
  modalClose: { padding: 6 },
  helperText: { color: '#9CA3AF', fontSize: 12, marginBottom: 8 },
  modalPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 8,
    marginBottom: 6
  },
  modalPhoneRowActive: { borderColor: WA_GREEN, backgroundColor: '#F0FDF4' },
  modalPhoneSelect: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalPhoneText: { color: '#374151', fontSize: 13 },
  modalPhoneActiveText: { color: '#065F46', fontFamily: 'Cairo-Bold' },
  modalActiveLabel: { color: WA_GREEN, fontSize: 10, fontFamily: 'Cairo-Bold' },
  modalRemove: { padding: 6 },
  modalInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  modalInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    fontSize: 14
  },
  modalAddButton: {
    backgroundColor: HEADER_BLUE,
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalError: { color: '#EF4444', fontSize: 12, marginTop: 6 },
  modalSave: {
    marginTop: 16,
    backgroundColor: WA_GREEN,
    borderRadius: 10,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  modalSaveText: { color: '#fff', fontFamily: 'Cairo-Bold' }
})
