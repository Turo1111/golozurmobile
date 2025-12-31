import React, { useEffect, useRef, useState } from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, SafeAreaView } from 'react-native'
import Icon from 'react-native-vector-icons/Feather'
import ClienteLocationPicker from './ClienteLocationPicker'

// Mapa de solo lectura a pantalla completa.
// Props:
// - visible: boolean
// - value: { lat, lng, address? }
// - initialValue: { lat, lng, address? }
// - onClose: () => void
// - subscribeToLocation?: (onLoc: (loc: {lat: number, lng: number, address?: string}) => void) => (() => void) | void
export default function ReadOnlyClientMapModal({ visible, value, onClose, initialValue, subscribeToLocation }) {
    const [selected, setSelected] = useState(initialValue || value || null)
    const unsubscribeRef = useRef(null)

    useEffect(() => {
        setSelected(value ?? initialValue ?? null)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, initialValue])

    useEffect(() => {
        if (!visible) return
        if (typeof subscribeToLocation === 'function') {
            try {
                const unsub = subscribeToLocation((loc) => {
                    if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return
                    setSelected({ lat: loc.lat, lng: loc.lng, address: loc.address })
                })
                unsubscribeRef.current = typeof unsub === 'function' ? unsub : null
            } catch (_) {
                unsubscribeRef.current = null
            }
        }
        return () => {
            try { unsubscribeRef.current && unsubscribeRef.current() } catch (_) { }
            unsubscribeRef.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, subscribeToLocation])

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
                <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
                    <ClienteLocationPicker
                        value={selected}
                        onChange={(loc) => { setSelected(loc) }}
                        readOnly={true}
                        height={Dimensions.get('window').height - 40}
                        showSearch={false}
                        showZoomControls={true}
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
                    {/* Address badge */}
                    {!!selected?.address && (
                        <View style={styles.addressBadge}>
                            <Text style={{ color: '#64748b', fontSize: 12 }} numberOfLines={2}>{selected.address}</Text>
                        </View>
                    )}
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
    addressBadge: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        marginHorizontal: 70,
        borderRadius: 10,
        marginBottom: 30
    }
})


