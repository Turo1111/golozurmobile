import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import ClienteLocationPicker from '../components/ClienteLocationPicker'
import Icon from 'react-native-vector-icons/Feather'
import apiClient from '../utils/client'
import useLocalStorage from '../hooks/useLocalStorage'
import { useAppSelector } from '../redux/hook'
import { getUser } from '../redux/userSlice'

export default function ViewClient({ route, navigation }) {
    const { id, name } = route.params || {}
    const user = useAppSelector(getUser)
    const { data: userStorage } = useLocalStorage([], 'user')
    const [location, setLocation] = useState(null)
    const [address, setAddress] = useState('')

    useEffect(() => {
        apiClient.get(`/client/${id}`, {
            headers: { Authorization: `Bearer ${user.token || userStorage.token}` }
        }).then((res) => {
            const c = res.data
            if (c?.lat && c?.lng) setLocation({ lat: c.lat, lng: c.lng, address: c.address })
            setAddress(c?.address || '')
        }).catch(() => { })
    }, [id, user.token, userStorage.token])

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, marginRight: 10 }}>
                        <Icon name="arrow-left" size={18} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{name || 'Cliente'}</Text>
                </View>
            </View>

            <View style={{ margin: 12 }}>
                <ClienteLocationPicker value={location} readOnly height={300} />
                {!!address && (
                    <Text style={{ marginTop: 8, color: '#64748b' }}>{address}</Text>
                )}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f6f8fa' },
    headerContainer: {
        backgroundColor: '#2563eb',
        paddingTop: 40,
        paddingBottom: 18,
        paddingHorizontal: 15,
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 18,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
})


