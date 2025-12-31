import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ScrollView } from 'react-native'
import { useAppDispatch, useAppSelector } from '../redux/hook'
import { getUser } from '../redux/userSlice'
import { setLoading, clearLoading } from '../redux/loadingSlice'
import { setAlert } from '../redux/alertSlice'
import useLocalStorage from '../hooks/useLocalStorage'
import apiClient from '../utils/client'
import Icon from 'react-native-vector-icons/Feather'
import usePermissionCheck from '../hooks/usePermissionCheck'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import ClienteLocationPicker from './ClienteLocationPicker'
import FullScreenMapModal from './FullScreenMapModal'

export default function SelectClient({ cliente, setIdCliente, idCliente }) {

    const user = useAppSelector(getUser)
    const { data: userStorage } = useLocalStorage([], 'user')
    const dispatch = useAppDispatch()

    const [search, setSearch] = useState('')
    const [clients, setClients] = useState([])
    const [isLoadingList, setIsLoadingList] = useState(false)
    const [selectedId, setSelectedId] = useState(idCliente)
    const [showCreate, setShowCreate] = useState(false)

    const { hasPermission: hasPermissionCreateClient } = usePermissionCheck('create_client', () => { })

    const headers = useMemo(() => ({
        Authorization: `Bearer ${user.token || userStorage.token}`
    }), [user.token, userStorage.token])

    const fetchClients = async (q) => {
        setIsLoadingList(true)
        try {
            const payload = q && q.trim() !== '' ? { input: q } : { input: '' }
            const { data } = await apiClient.post('/client/search', payload, { headers })
            setClients(Array.isArray(data) ? data : [])
        } catch (e) {
            setClients([])
        } finally {
            setIsLoadingList(false)
        }
    }

    useEffect(() => {
        fetchClients('')
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const delay = setTimeout(() => {
            fetchClients(search)
        }, 300)
        return () => clearTimeout(delay)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search])

    const handleSelect = (item) => {
        setSelectedId(item._id)
        setIdCliente(item._id)
        if (cliente && typeof cliente.onChangeText === 'function') {
            cliente.onChangeText(item.nombreCompleto)
        }
    }

    // --- Crear Cliente (pantalla completa, réplica de NewClient) ---
    const validationSchema = Yup.object().shape({
        nombreCompleto: Yup.string().required('El nombre completo es obligatorio').min(3, 'El nombre debe tener al menos 3 caracteres')
    })

    const [telefonos, setTelefonos] = useState([])
    const [telefonoInput, setTelefonoInput] = useState('')
    const [location, setLocation] = useState(null)
    const [mapVisible, setMapVisible] = useState(false)

    const formik = useFormik({
        initialValues: {
            nombreCompleto: '',
            address: '',
            telefonos: [],
            lat: null,
            lng: null,
            description: ''
        },
        validationSchema,
        onSubmit: async (values) => {

            if (values.nombreCompleto === '') {
                dispatch(setAlert({ message: 'Debe agregar un nombre completo', type: 'warning' }))
                return
            }

            dispatch(setLoading({ message: 'Creando cliente' }))
            const payload = { ...values }
            try {
                const { data } = await apiClient.post('/client', payload, { headers })
                dispatch(clearLoading())
                dispatch(setAlert({ message: 'Cliente creado correctamente', type: 'success' }))
                const created = data && data._id ? data : { _id: Math.random().toString(36).slice(2), nombreCompleto: values.nombreCompleto }
                setClients((prev) => [created, ...prev])
                handleSelect(created)
                // Reset y volver a lista
                formik.resetForm()
                setTelefonos([])
                setTelefonoInput('')
                setLocation(null)
                setShowCreate(false)
            } catch (e) {
                dispatch(clearLoading())
                dispatch(setAlert({ message: `${e.response?.data || 'Ocurrio un error'}`, type: 'error' }))
            }
        }
    })

    useEffect(() => {
        if (location?.lat && location?.lng) {
            formik.setFieldValue('lat', location.lat)
            formik.setFieldValue('lng', location.lng)
            if (location.address) formik.setFieldValue('address', location.address)
        } else {
            formik.setFieldValue('lat', null)
            formik.setFieldValue('lng', null)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location])

    const addTelefono = () => {
        if (telefonoInput.trim() && !isNaN(telefonoInput)) {
            const newTelefonos = [...telefonos, parseInt(telefonoInput)]
            setTelefonos(newTelefonos)
            formik.setFieldValue('telefonos', newTelefonos)
            setTelefonoInput('')
        }
    }

    const removeTelefono = (index) => {
        const newTelefonos = telefonos.filter((_, i) => i !== index)
        setTelefonos(newTelefonos)
        formik.setFieldValue('telefonos', newTelefonos)
    }

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.clientRow, selectedId === item._id && styles.clientRowActive]}
            onPress={() => handleSelect(item)}
        >
            <View style={{ flex: 1 }}>
                <Text style={styles.clientName}>{item.nombreCompleto}</Text>
                {!!item.address && (
                    <Text style={styles.clientSub}>{item.address}</Text>
                )}
            </View>
            {selectedId === item._id ? (
                <Icon name="check" size={18} color="#10B981" />
            ) : (
                <Icon name="user" size={18} color="#9ca3af" />
            )}
        </TouchableOpacity>
    )

    return (
        <View style={{ flex: 1 }}>
            {!showCreate && (
                <>
                    <View style={styles.headerRow}>
                        <Text style={styles.title}>Seleccionar cliente</Text>
                    </View>
                    <View style={styles.searchBar}>
                        <Icon name="search" size={16} color="#7F8487" style={{ marginLeft: 10 }} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar clientes por nombre..."
                            placeholderTextColor="#b0b0b0"
                            value={search}
                            onChangeText={setSearch}
                        />
                        {hasPermissionCreateClient && (
                            <TouchableOpacity style={styles.addInline} onPress={() => setShowCreate(true)}>
                                <Icon name={'user-plus'} size={16} color="#2563eb" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <FlatList
                        data={clients}
                        keyExtractor={(item) => item._id?.toString?.() || String(item._id)}
                        renderItem={renderItem}
                        ListEmptyComponent={
                            <View style={styles.emptyBox}>
                                <Icon name={isLoadingList ? 'loader' : 'users'} size={48} color="#d1d5db" />
                                <Text style={styles.emptyText}>{isLoadingList ? 'Buscando...' : 'Sin resultados'}</Text>
                            </View>
                        }
                        contentContainerStyle={{ paddingBottom: 10 }}
                    />
                </>
            )}

            {showCreate && hasPermissionCreateClient && (
                <View style={{ flex: 1 }}>
                    {/* Formulario (sin header de pantalla completa) */}
                    <ScrollView style={{ flex: 1 }}>
                        <View style={styles.sectionContainer}>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.sectionIcon, { backgroundColor: '#EBF5FF' }]}>
                                    <Icon name="user" size={18} color="#2563eb" />
                                </View>
                                <Text style={styles.sectionTitle}>Información del Cliente</Text>
                            </View>

                            <View style={styles.fieldContainer}>
                                <Text style={styles.fieldLabel}>Nombre Completo *</Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        formik.errors.nombreCompleto && formik.touched.nombreCompleto && styles.inputError
                                    ]}
                                    value={formik.values.nombreCompleto}
                                    onChangeText={formik.handleChange('nombreCompleto')}
                                    onBlur={formik.handleBlur('nombreCompleto')}
                                    placeholder="Ingrese el nombre completo del cliente"
                                />
                                {formik.errors.nombreCompleto && formik.touched.nombreCompleto && (
                                    <Text style={styles.errorText}>{formik.errors.nombreCompleto}</Text>
                                )}
                            </View>

                            <View style={styles.fieldContainer}>
                                <Text style={styles.fieldLabel}>Teléfonos *</Text>
                                <View style={styles.telefonoContainer}>
                                    <TextInput
                                        style={styles.telefonoInput}
                                        value={telefonoInput}
                                        onChangeText={setTelefonoInput}
                                        placeholder="Ingrese un número de teléfono"
                                        keyboardType="numeric"
                                    />
                                    <TouchableOpacity style={styles.addButton} onPress={addTelefono}>
                                        <Icon name="plus" size={18} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                                {telefonos.length > 0 && (
                                    <View style={styles.telefonosList}>
                                        {telefonos.map((telefono, index) => (
                                            <View key={index} style={styles.telefonoItem}>
                                                <Text style={styles.telefonoText}>{telefono}</Text>
                                                <TouchableOpacity onPress={() => removeTelefono(index)} style={styles.removeButtonContainer}>
                                                    <Icon name="trash-2" size={16} color="#ef4444" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={styles.sectionContainer}>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.sectionIcon, { backgroundColor: '#ECFDF5' }]}>
                                    <Icon name="map-pin" size={18} color="#10B981" />
                                </View>
                                <Text style={styles.sectionTitle}>Ubicación</Text>
                            </View>

                            <View style={{ marginTop: 0 }}>

                                {location?.address && (
                                    <Text style={{ marginTop: 6, color: '#64748b' }}>{location.address}</Text>
                                )}
                                <View style={{ position: 'relative' }}>
                                    <ClienteLocationPicker value={location} onChange={setLocation} height={320} />
                                    <TouchableOpacity
                                        onPress={() => setMapVisible(true)}
                                        style={{ position: 'absolute', top: 80, right: 5, backgroundColor: '#FFF', borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', elevation: 3 }}
                                        accessibilityRole="button"
                                    >
                                        <Icon name="maximize" size={18} color="#000" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                    </ScrollView>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setShowCreate(false)}
                        >
                            <Icon name="x" size={16} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.buttonText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={() => formik.handleSubmit()}
                        >
                            <Icon name="save" size={16} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.buttonText}>Guardar</Text>
                        </TouchableOpacity>
                    </View>
                    <FullScreenMapModal
                        visible={mapVisible}
                        initialValue={location}
                        onClose={() => setMapVisible(false)}
                        onConfirm={(loc) => {
                            setLocation(loc || null)
                            setMapVisible(false)
                        }}
                    />
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    headerRow: {
        paddingHorizontal: 5,
        paddingBottom: 6
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#252525'
    },
    searchBar: {
        backgroundColor: '#fff',
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 4,
    },
    searchInput: {
        flex: 1,
        height: 40,
        fontSize: 15,
        color: '#252525',
        paddingHorizontal: 10,
    },
    addInline: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        padding: 10,
        fontSize: 14,
        backgroundColor: '#fff',
        marginBottom: 8,
    },
    clientRow: {
        backgroundColor: '#fff',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginHorizontal: 2,
        marginVertical: 5,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    clientRowActive: {
        borderWidth: 1,
        borderColor: '#10B981'
    },
    clientName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#252525',
        marginBottom: 2,
    },
    clientSub: {
        fontSize: 12,
        color: '#7F8487'
    },
    emptyBox: {
        alignItems: 'center',
        paddingVertical: 20
    },
    emptyText: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 8
    },
    // --- estilos equivalentes a NewClient ---
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
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    onlineBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 2,
    },
    onlineDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    sectionContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginHorizontal: 15,
        marginTop: 15,
        paddingHorizontal: 15,
        paddingVertical: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    fieldContainer: {
        marginBottom: 16,
    },
    fieldLabel: {
        fontSize: 14,
        color: '#7F8487',
        marginBottom: 5,
    },
    inputError: {
        borderColor: '#ef4444',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 12,
        marginTop: 4,
    },
    telefonoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    telefonoInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        padding: 10,
        fontSize: 14,
        backgroundColor: '#fff',
    },
    addButton: {
        backgroundColor: '#2366CB',
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    telefonosList: {
        marginTop: 12,
    },
    telefonoItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        padding: 10,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    telefonoText: {
        fontSize: 14,
        color: '#64748b',
    },
    removeButtonContainer: {
        padding: 6,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginVertical: 15,
        paddingHorizontal: 15,
    },
    cancelButton: {
        flex: 1,
        margin: 4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6B7280',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        minWidth: 120,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    saveButton: {
        flex: 1,
        margin: 4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2366CB',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        minWidth: 120,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    buttonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'Cairo-Bold',
    },
})


