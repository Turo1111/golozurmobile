import React, { useEffect, useRef, useState } from 'react'
import { Alert, Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, SafeAreaView, TextInput } from 'react-native'
import Icon from 'react-native-vector-icons/Feather'
import ClienteLocationPicker from './ClienteLocationPicker'
import { NOMINATIM_USER_AGENT, reverseGeocode } from '../utils/location/reverseGeocode'

const SEARCH_FAILURE_MESSAGE = 'No se pudo buscar la dirección. Verifique la conexión e intente nuevamente.'
const REVERSE_FAILURE_MESSAGE = 'No se pudo obtener la dirección. Verifique la conexión e intente nuevamente.'

export default function FullScreenMapModal({ visible, value, onChange, onClose, onConfirm, readOnly, initialValue, allowDevicePrefill = false }) {
    const [searchQuery, setSearchQuery] = useState('')
    const [searchLoading, setSearchLoading] = useState(false)
    const [searchResults, setSearchResults] = useState([])
    const typingTimeout = useRef(null)
    const reverseReqIdRef = useRef(0)
    const mountedRef = useRef(true)
    // La selección se toma de las props en el primer render: los consumidores montan el
    // modal al abrirlo, así el picker recibe la ubicación sin depender del timing de efectos.
    const [selected, setSelected] = useState(initialValue || value || null)

    useEffect(() => {
        mountedRef.current = true
        return () => { mountedRef.current = false }
    }, [])

    const searchPlaces = async () => {
        const q = searchQuery?.trim()
        if (!q) {
            setSearchResults([])
            return
        }
        try {
            setSearchLoading(true)
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=6`
            const res = await fetch(url, {
                headers: { 'User-Agent': NOMINATIM_USER_AGENT }
            })
            const data = await res.json()
            setSearchResults(Array.isArray(data) ? data : [])
        } catch (_e) {
            setSearchResults([])
            Alert.alert('Búsqueda', SEARCH_FAILURE_MESSAGE)
        } finally {
            setSearchLoading(false)
        }
    }

    useEffect(() => {
        if (!visible) return
        if (typingTimeout.current) clearTimeout(typingTimeout.current)
        const q = searchQuery?.trim() || ''
        if (q.length < 3) {
            setSearchResults([])
            setSearchLoading(false)
            return
        }
        typingTimeout.current = setTimeout(() => {
            searchPlaces()
        }, 450)
        return () => typingTimeout.current && clearTimeout(typingTimeout.current)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, visible])

    const commitSelection = (loc) => {
        // Invalidar geocodificaciones en curso para que no sobrescriban esta selección.
        reverseReqIdRef.current += 1
        setSelected(loc)
        onChange && onChange(loc)
        setSearchResults([])
    }

    const handleSelectSearchResult = async (item) => {
        const lat = parseFloat(item.lat)
        const lng = parseFloat(item.lon)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
        const address = typeof item.display_name === 'string' ? item.display_name.trim() : ''
        if (address) {
            commitSelection({ lat, lng, address })
            return
        }
        // Sin display_name: resolver la dirección con el geocoder acotado antes de comitear.
        const myId = ++reverseReqIdRef.current
        const geo = await reverseGeocode(lat, lng)
        if (!mountedRef.current) return
        if (myId !== reverseReqIdRef.current) return
        if (!geo.ok || !geo.address) {
            Alert.alert('Ubicación', REVERSE_FAILURE_MESSAGE)
            return
        }
        commitSelection({ lat, lng, address: geo.address })
    }

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
                <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
                    <ClienteLocationPicker
                        value={selected}
                        onChange={(loc) => {
                            setSelected(loc)
                            onChange && onChange(loc)
                        }}
                        readOnly={!!readOnly}
                        allowDevicePrefill={allowDevicePrefill}
                        height={Dimensions.get('window').height - 50}
                        showSearch={false}
                        showZoomControls={false}
                        marginBottom={5}
                    />
                    {/* FAB cerrar */}
                    <TouchableOpacity
                        accessibilityRole="button"
                        onPress={onClose}
                        style={styles.fabClose}
                    >
                        <Icon name="x" size={18} color="#000" />
                    </TouchableOpacity>
                    {/* FAB confirmar */}
                    {!readOnly && (
                        <TouchableOpacity
                            accessibilityRole="button"
                            onPress={() => onConfirm?.(selected)}
                            style={styles.fabConfirm}
                        >
                            <Icon name="check" size={18} color="#000" />
                        </TouchableOpacity>
                    )}
                    {/* Buscador flotante */}
                    <View style={styles.searchFloating}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar dirección o ciudad"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {!!searchResults?.length && (
                            <View style={styles.resultsContainer}>
                                {searchResults.map((it, idx) => (
                                    <TouchableOpacity key={`${it.place_id || idx}`} style={styles.resultItem} onPress={() => handleSelectSearchResult(it)}>
                                        <Text numberOfLines={2} style={styles.resultText}>{it.display_name}</Text>
                                    </TouchableOpacity>
                                ))}
                                {searchLoading && (
                                    <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                                        <Text style={{ color: '#64748b', fontSize: 12 }}>Buscando…</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                    <View style={{ paddingHorizontal: 15, paddingVertical: 10, position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', marginHorizontal: 70, borderRadius: 10, marginBottom: 30 }}>
                        <Text style={{ color: '#64748b', fontSize: 12 }}>{selected?.address}</Text>
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    )
}

const styles = StyleSheet.create({
    fabClose: {
        position: 'absolute',
        top: 80,
        right: 5,
        backgroundColor: '#FFF',
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    fabConfirm: {
        position: 'absolute',
        top: 80,
        right: 54,
        backgroundColor: '#FFF',
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    searchFloating: {
        position: 'absolute',
        top: 16,
        left: 10,
        right: 10,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingHorizontal: 10,
        paddingVertical: 8,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    searchInput: {
        height: 38,
        color: '#252525'
    },
    resultsContainer: {
        position: 'absolute',
        top: 48,
        left: 0,
        right: 0,
        zIndex: 10,
        marginTop: 6,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 6
    },
    resultItem: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9'
    },
    resultText: {
        color: '#334155',
        fontSize: 13
    }
})


