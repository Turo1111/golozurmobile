import React, { useState, useEffect, useContext } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native'
import { useAppDispatch, useAppSelector } from '../redux/hook'
import { getUser } from '../redux/userSlice'
import { setLoading, clearLoading } from '../redux/loadingSlice'
import { setAlert } from '../redux/alertSlice'
import apiClient from '../utils/client'
import useLocalStorage from '../hooks/useLocalStorage'
import Button from '../components/Button'
import InputSelectAdd from '../components/InputSelectAdd'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import usePermissionCheck from '../hooks/usePermissionCheck'
import Icon from 'react-native-vector-icons/Feather'
import { OfflineContext } from '../context.js/contextOffline'

const HEADER_BLUE = '#2563eb';

const validationSchema = Yup.object().shape({
    nombreCompleto: Yup.string()
        .required('El nombre completo es obligatorio')
        .min(3, 'El nombre debe tener al menos 3 caracteres'),
    idCiudad: Yup.string()
        .required('Debe seleccionar una ciudad')
})

export default function EditClient({ route, navigation }) {
    const user = useAppSelector(getUser)
    const { data: userStorage } = useLocalStorage([], 'user')
    const dispatch = useAppDispatch()
    const [initialValues, setInitialValues] = useState({
        nombreCompleto: '',
        direccion: '',
        telefonos: [],
        idCiudad: '',
        NameCiudad: ''
    })
    const { id } = route.params || {}
    const { offline } = useContext(OfflineContext)

    const { hasPermission: hasPermissionUpdateClient, isLoading: isLoadingUpdateClient } = usePermissionCheck('update_client', () => { })

    const formik = useFormik({
        enableReinitialize: true,
        initialValues,
        validationSchema,
        onSubmit: (values) => {
            // Validar que al menos un teléfono esté presente
            if (values.telefonos.length === 0) {
                dispatch(setAlert({
                    message: 'Debe agregar al menos un teléfono',
                    type: 'warning'
                }))
                return
            }

            dispatch(setLoading({ message: 'Actualizando cliente' }))
            apiClient.patch(`/client/${id}`, values, {
                headers: {
                    Authorization: `Bearer ${user.token || userStorage.token}`
                },
            })
                .then(() => {
                    dispatch(clearLoading())
                    dispatch(setAlert({
                        message: 'Cliente actualizado correctamente',
                        type: 'success'
                    }))
                    navigation.goBack()
                })
                .catch((e) => {
                    dispatch(clearLoading())
                    dispatch(setAlert({
                        message: `${e.response?.data || 'Ocurrio un error'}`,
                        type: 'error'
                    }))
                })
        }
    })

    const [telefonos, setTelefonos] = useState([])
    const [telefonoInput, setTelefonoInput] = useState('')

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

    useEffect(() => {
        if (user.token || userStorage.token) {
            getClientData()
        }
    }, [user.token, userStorage.token])

    const getClientData = () => {
        dispatch(setLoading({ message: 'Cargando cliente' }))
        apiClient.get(`/client/${id}`, {
            headers: {
                Authorization: `Bearer ${user.token || userStorage.token}`
            },
        })
            .then(response => {
                const clientData = response.data
                console.log('clientData', clientData)
                setInitialValues({
                    nombreCompleto: clientData.nombreCompleto || '',
                    direccion: clientData.direccion || '',
                    telefonos: clientData.telefonos || [],
                    idCiudad: clientData.idCiudad || '',
                    NameCiudad: clientData.ciudad?.descripcion || ''
                })
                setTelefonos(clientData.telefonos || [])
                dispatch(clearLoading())
            })
            .catch((e) => {
                dispatch(clearLoading())
                dispatch(setAlert({
                    message: `${e.response?.data || 'Ocurrio un error'}`,
                    type: 'error'
                }))
            })
    }

    if (isLoadingUpdateClient || !hasPermissionUpdateClient) {
        return null
    }

    return (
        <View style={styles.container}>
            {/* HEADER */}
            <View style={styles.headerContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, marginRight: 10 }}>
                            <Icon name="arrow-left" size={18} color="#fff" />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.headerTitle}>Editar Cliente</Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={styles.onlineBadge}>
                            <View style={[styles.onlineDot, { backgroundColor: offline ? '#C7253E' : '#4CAF50' }]} />
                            <Text style={{ color: '#fff', fontSize: 13, marginLeft: 4 }}>{offline ? 'Offline' : 'Online'}</Text>
                        </View>
                    </View>
                </View>
            </View>

            <ScrollView style={styles.scrollContainer}>
                {/* INFORMACIÓN DEL CLIENTE */}
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
                        <Text style={styles.fieldLabel}>Dirección</Text>
                        <TextInput
                            style={styles.input}
                            value={formik.values.direccion}
                            onChangeText={formik.handleChange('direccion')}
                            onBlur={formik.handleBlur('direccion')}
                            placeholder="Ingrese la dirección del cliente"
                        />
                    </View>
                </View>

                {/* UBICACIÓN */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIcon, { backgroundColor: '#ECFDF5' }]}>
                            <Icon name="map-pin" size={18} color="#10B981" />
                        </View>
                        <Text style={styles.sectionTitle}>Ubicación</Text>
                    </View>

                    <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>Ciudad *</Text>
                        <InputSelectAdd
                            value={formik.values.idCiudad}
                            onChange={(id, item) => {
                                formik.setFieldValue('idCiudad', id)
                                formik.setFieldValue('NameCiudad', item.descripcion)
                            }}
                            name={'Ciudad'} path={'city'}
                        />
                        {formik.errors.idCiudad && formik.touched.idCiudad && (
                            <Text style={styles.errorText}>{formik.errors.idCiudad}</Text>
                        )}
                    </View>
                </View>

                {/* CONTACTO */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIcon, { backgroundColor: '#FEE2E2' }]}>
                            <Icon name="phone" size={18} color="#EF4444" />
                        </View>
                        <Text style={styles.sectionTitle}>Información de Contacto</Text>
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
            </ScrollView>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="x" size={16} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={formik.handleSubmit}
                >
                    <Icon name="save" size={16} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Actualizar</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContainer: {
        flex: 1,
    },
    headerContainer: {
        backgroundColor: HEADER_BLUE,
        paddingTop: 50,
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
    input: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        padding: 10,
        fontSize: 14,
        backgroundColor: '#fff',
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
});
