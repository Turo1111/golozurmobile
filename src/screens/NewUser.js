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

const validationSchema = Yup.object().shape({
    nickname: Yup.string()
        .required('El apodo es obligatorio')
        .min(3, 'El apodo debe tener al menos 3 caracteres'),
    password: Yup.string()
        .required('La contraseña es obligatoria')
        .min(6, 'La contraseña debe tener al menos 6 caracteres'),
    role: Yup.string()
        .required('Debe seleccionar un rol')
})

export default function NewUser({ navigation }) {
    const user = useAppSelector(getUser)
    const { data: userStorage } = useLocalStorage([], 'user')
    const dispatch = useAppDispatch()
    const [roles, setRoles] = useState([])

    const formik = useFormik({
        initialValues: {
            nickname: '',
            email: '',
            password: '',
            role: '',
            isActive: true
        },
        validationSchema,
        onSubmit: (values) => {

            dispatch(setLoading({
                message: 'Creando usuario'
            }))

            apiClient.post('/auth/register', values, {
                headers: {
                    Authorization: `Bearer ${user.token || userStorage.token}`
                },
            })
                .then(() => {
                    dispatch(clearLoading())
                    dispatch(setAlert({
                        message: 'Usuario creado correctamente',
                        type: 'success'
                    }))
                    navigation.navigate('Users')
                })
                .catch((e) => {
                    dispatch(clearLoading())
                    dispatch(setAlert({
                        message: e.response?.data?.error || 'Error al procesar la solicitud',
                        type: 'error'
                    }))
                })
        }
    })

    useEffect(() => {
        if (user.token || userStorage.token) {
            getRoles()
        }
    }, [user.token, userStorage.token])

    const getRoles = () => {
        dispatch(setLoading({
            message: 'Cargando roles'
        }))

        apiClient.get('/role', {
            headers: {
                Authorization: `Bearer ${user.token || userStorage.token}`
            },
        })
            .then(response => {
                setRoles(response.data)
                dispatch(clearLoading())
            })
            .catch(e => {
                console.log("error", e)
                dispatch(clearLoading())
                dispatch(setAlert({
                    message: e.response?.data?.error || 'Error al cargar los roles',
                    type: 'error'
                }))
            })
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
                    <Text style={styles.label}>Contraseña *</Text>
                    <TextInput
                        style={[styles.input, formik.errors.password && formik.touched.password && styles.inputError]}
                        value={formik.values.password}
                        onChangeText={formik.handleChange('password')}
                        onBlur={formik.handleBlur('password')}
                        placeholder="Ingrese la contraseña"
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
                                    // Si el rol ya está seleccionado, lo deseleccionamos
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
                        text="Crear Usuario"
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