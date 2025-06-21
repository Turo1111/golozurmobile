import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native'
import { useAppDispatch, useAppSelector } from '../redux/hook'
import { getUser } from '../redux/userSlice'
import { setLoading, clearLoading } from '../redux/loadingSlice'
import { setAlert } from '../redux/alertSlice'
import apiClient from '../utils/client'
import useLocalStorage from '../hooks/useLocalStorage'
import Button from '../components/Button'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import usePermissionCheck from '../hooks/usePermissionCheck'

const validationSchema = Yup.object().shape({
    nickname: Yup.string()
        .required('El apodo es obligatorio')
        .min(3, 'El apodo debe tener al menos 3 caracteres'),
    password: Yup.string()
        .min(6, 'La contraseña debe tener al menos 6 caracteres'),
    role: Yup.string()
        .required('Debe seleccionar un rol')
})

export default function EditUser({ route, navigation }) {
    const user = useAppSelector(getUser)
    const { data: userStorage } = useLocalStorage([], 'user')
    const dispatch = useAppDispatch()
    const [roles, setRoles] = useState([])
    const [initialValues, setInitialValues] = useState({
        nickname: '',
        email: '',
        password: '',
        role: '',
        isActive: true
    })
    const { id } = route.params || {}

    const { hasPermission: hasPermissionUpdateUser, isLoading: isLoadingUpdateUser } = usePermissionCheck('update_user', () => { })

    const formik = useFormik({
        enableReinitialize: true,
        initialValues,
        validationSchema,
        onSubmit: (values) => {
            dispatch(setLoading({ message: 'Actualizando usuario' }))
            apiClient.patch(`/user/${id}`, values, {
                headers: {
                    Authorization: `Bearer ${user.token || userStorage.token}`
                },
            })
                .then(() => {
                    dispatch(clearLoading())
                    dispatch(setAlert({
                        message: 'Usuario actualizado correctamente',
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

    useEffect(() => {
        if (user.token || userStorage.token) {
            getRoles()
            getUserData()
        }
    }, [user.token, userStorage.token])

    const getRoles = () => {
        dispatch(setLoading({ message: 'Cargando roles' }))
        apiClient.get('/role', {
            headers: {
                Authorization: `Bearer ${user.token || userStorage.token}`
            },
        })
            .then(response => {
                setRoles(response.data)
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

    const getUserData = () => {
        dispatch(setLoading({ message: 'Cargando usuario' }))
        apiClient.get(`/user/${id}`, {
            headers: {
                Authorization: `Bearer ${user.token || userStorage.token}`
            },
        })
            .then(response => {
                setInitialValues({
                    nickname: response.data.nickname || '',
                    email: response.data.email || '',
                    password: '',
                    role: response.data.role || '',
                    isActive: response.data.isActive !== undefined ? response.data.isActive : true
                })
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

    if (isLoadingUpdateUser || !hasPermissionUpdateUser) {
        return null
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Nombre *</Text>
                    <TextInput
                        style={[styles.input, formik.errors.nickname && formik.touched.nickname && styles.inputError]}
                        value={formik.values.nickname}
                        onChangeText={formik.handleChange('nickname')}
                        onBlur={formik.handleBlur('nickname')}
                        placeholder="Ingrese el nombre del usuario"
                    />
                    {formik.errors.nickname && formik.touched.nickname && (
                        <Text style={styles.errorText}>{formik.errors.nickname}</Text>
                    )}
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Contraseña (opcional)</Text>
                    <TextInput
                        style={[styles.input, formik.errors.password && formik.touched.password && styles.inputError]}
                        value={formik.values.password}
                        onChangeText={formik.handleChange('password')}
                        onBlur={formik.handleBlur('password')}
                        placeholder="Dejar vacío para mantener la contraseña actual"
                        secureTextEntry
                    />
                    {formik.errors.password && formik.touched.password && (
                        <Text style={styles.errorText}>{formik.errors.password}</Text>
                    )}
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Rol *</Text>
                    <View style={styles.roleContainer}>
                        {roles.map(role => (
                            <TouchableOpacity
                                key={role._id}
                                style={[
                                    styles.roleButton,
                                    formik.values.role === role._id && styles.roleButtonSelected
                                ]}
                                onPress={() => {
                                    if (formik.values.role === role._id) {
                                        formik.setFieldValue('role', '')
                                    } else {
                                        formik.setFieldValue('role', role._id)
                                    }
                                }}
                            >
                                <Text style={[
                                    styles.roleButtonText,
                                    formik.values.role === role._id && styles.roleButtonTextSelected
                                ]}>
                                    {role.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    {formik.errors.role && formik.touched.role && (
                        <Text style={styles.errorText}>{formik.errors.role}</Text>
                    )}
                </View>
                <View style={styles.buttonContainer}>
                    <Button
                        text="Actualizar Usuario"
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
    roleContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    roleButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        backgroundColor: '#fff',
    },
    roleButtonSelected: {
        backgroundColor: '#799351',
        borderColor: '#799351',
    },
    roleButtonText: {
        fontSize: 14,
        color: '#64748b',
    },
    roleButtonTextSelected: {
        color: '#fff',
    },
    buttonContainer: {
        marginTop: 16,
    },
});