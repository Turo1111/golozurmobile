import React, { useState, useEffect } from 'react'
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
        <ScrollView style={styles.container}>
            <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Nombre Completo *</Text>
                    <TextInput
                        style={[styles.input, formik.errors.nombreCompleto && formik.touched.nombreCompleto && styles.inputError]}
                        value={formik.values.nombreCompleto}
                        onChangeText={formik.handleChange('nombreCompleto')}
                        onBlur={formik.handleBlur('nombreCompleto')}
                        placeholder="Ingrese el nombre completo del cliente"
                    />
                    {formik.errors.nombreCompleto && formik.touched.nombreCompleto && (
                        <Text style={styles.errorText}>{formik.errors.nombreCompleto}</Text>
                    )}
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Dirección</Text>
                    <TextInput
                        style={styles.input}
                        value={formik.values.direccion}
                        onChangeText={formik.handleChange('direccion')}
                        onBlur={formik.handleBlur('direccion')}
                        placeholder="Ingrese la dirección del cliente"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Ciudad *</Text>
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

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Teléfonos *</Text>
                    <View style={styles.telefonoContainer}>
                        <TextInput
                            style={styles.telefonoInput}
                            value={telefonoInput}
                            onChangeText={setTelefonoInput}
                            placeholder="Ingrese un número de teléfono"
                            keyboardType="numeric"
                        />
                        <TouchableOpacity style={styles.addButton} onPress={addTelefono}>
                            <Text style={styles.addButtonText}>+</Text>
                        </TouchableOpacity>
                    </View>
                    {telefonos.length > 0 && (
                        <View style={styles.telefonosList}>
                            {telefonos.map((telefono, index) => (
                                <View key={index} style={styles.telefonoItem}>
                                    <Text style={styles.telefonoText}>{telefono}</Text>
                                    <TouchableOpacity onPress={() => removeTelefono(index)}>
                                        <Text style={styles.removeButton}>×</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.buttonContainer}>
                    <Button
                        text="Actualizar Cliente"
                        onPress={formik.handleSubmit}
                        width="100%"
                    />
                </View>
            </View>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    formContainer: {
        padding: 16,
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 6,
        padding: 10,
        fontSize: 14,
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
        borderRadius: 6,
        padding: 10,
        fontSize: 14,
    },
    addButton: {
        backgroundColor: '#799351',
        width: 40,
        height: 40,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButtonText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    telefonosList: {
        marginTop: 8,
    },
    telefonoItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        padding: 8,
        borderRadius: 4,
        marginBottom: 4,
    },
    telefonoText: {
        fontSize: 14,
        color: '#64748b',
    },
    removeButton: {
        color: '#ef4444',
        fontSize: 18,
        fontWeight: 'bold',
    },
    buttonContainer: {
        marginTop: 16,
    },
});
