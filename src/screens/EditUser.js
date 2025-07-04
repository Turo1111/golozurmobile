import React, { useState, useEffect, useContext } from 'react'
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
import Icon from 'react-native-vector-icons/Feather'
import { OfflineContext } from '../context.js/contextOffline'

const HEADER_BLUE = '#2563eb';

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
        password: '',
        role: '',
        isActive: true
    })
    const { id } = route.params || {}
    const { offline } = useContext(OfflineContext)

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
                    console.log(e)
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
        <View style={styles.container}>
            {/* HEADER */}
            <View style={styles.headerContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, marginRight: 10 }}>
                            <Icon name="arrow-left" size={18} color="#fff" />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.headerTitle}>Editar Usuario</Text>
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
                {/* INFORMACIÓN DEL USUARIO */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIcon, { backgroundColor: '#EBF5FF' }]}>
                            <Icon name="user" size={18} color="#2563eb" />
                        </View>
                        <Text style={styles.sectionTitle}>Información del Usuario</Text>
                    </View>

                    <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>Nombre de Usuario *</Text>
                        <TextInput
                            style={[
                                styles.input,
                                formik.errors.nickname && formik.touched.nickname && styles.inputError
                            ]}
                            value={formik.values.nickname}
                            onChangeText={formik.handleChange('nickname')}
                            onBlur={formik.handleBlur('nickname')}
                            placeholder="Ingrese el nombre del usuario"
                        />
                        {formik.errors.nickname && formik.touched.nickname && (
                            <Text style={styles.errorText}>{formik.errors.nickname}</Text>
                        )}
                    </View>

                    <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>Contraseña (opcional)</Text>
                        <TextInput
                            style={[
                                styles.input,
                                formik.errors.password && formik.touched.password && styles.inputError
                            ]}
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
                </View>

                {/* ASIGNACIÓN DE ROL */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIcon, { backgroundColor: '#ECFDF5' }]}>
                            <Icon name="shield" size={18} color="#10B981" />
                        </View>
                        <Text style={styles.sectionTitle}>Rol de Usuario</Text>
                    </View>

                    <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>Seleccione un Rol *</Text>
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
    roleContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 5,
    },
    roleButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        backgroundColor: '#fff',
        marginRight: 8,
        marginBottom: 8,
    },
    roleButtonSelected: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
    },
    roleButtonText: {
        fontSize: 14,
        color: '#64748b',
    },
    roleButtonTextSelected: {
        color: '#fff',
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