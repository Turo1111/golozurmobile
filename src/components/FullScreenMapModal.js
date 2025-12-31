import React, { useEffect, useRef, useState } from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, SafeAreaView, TextInput } from 'react-native'
import Icon from 'react-native-vector-icons/Feather'
import ClienteLocationPicker from './ClienteLocationPicker'

export default function FullScreenMapModal({ visible, value, onChange, onClose, onConfirm, readOnly, initialValue }) {
    const [searchQuery, setSearchQuery] = useState('')
    const [searchLoading, setSearchLoading] = useState(false)
    const [searchResults, setSearchResults] = useState([])
    const typingTimeout = useRef(null)
    const [selected, setSelected] = useState(initialValue || value || null)

    useEffect(() => {
        console.log('sincronizando selección local')
        // sincronizar selección local cuando cambian las props controladas
        setSelected(value ?? initialValue ?? null)
    }, [value, initialValue])

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
                headers: { 'User-Agent': 'GolozurApp/1.0 (contact@example.com)' }
            })
            const data = await res.json()
            setSearchResults(Array.isArray(data) ? data : [])
        } catch (_e) {
            setSearchResults([])
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

    const handleSelectSearchResult = (item) => {
        const lat = parseFloat(item.lat)
        const lng = parseFloat(item.lon)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
        const address = item.display_name
        const loc = { lat, lng, address }
        setSelected(loc)
        onChange && onChange(loc)
        setSearchResults([])
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


