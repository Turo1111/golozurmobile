import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native'
import { useAppDispatch, useAppSelector } from '../redux/hook'
import { getUser } from '../redux/userSlice'
import { setLoading, clearLoading } from '../redux/loadingSlice'
import { setAlert } from '../redux/alertSlice'
import apiClient from '../utils/client'
import useLocalStorage from '../hooks/useLocalStorage'
import Button from '../components/Button'

const entities = [
    { id: "user", name: "Usuarios" },
    { id: "role", name: "Roles" },
    { id: "product", name: "Productos" },
    { id: "sale", name: "Ventas" },
    { id: "buy", name: "Compras" },
]

const actions = [
    { id: "create", name: "Crear" },
    { id: "read", name: "Visualizar" },
    { id: "update", name: "Modificar" },
    { id: "delete", name: "Borrar" },
]

export default function DetailsRole({ route, navigation }) {
    const { id, name } = route.params
    const user = useAppSelector(getUser)
    const { data: userStorage } = useLocalStorage([], 'user')
    const dispatch = useAppDispatch()
    const [role, setRole] = useState(null)

    useEffect(() => {
        if (id && (user.token || userStorage.token)) {
            getRoleDetails()
        }
    }, [id, user.token, userStorage.token])

    const getRoleDetails = () => {
        dispatch(setLoading({
            message: 'Cargando detalles del rol'
        }))

        apiClient.get(`/role/${id}`, {
            headers: {
                Authorization: `Bearer ${user.token || userStorage.token}`
            },
        })
            .then(response => {
                setRole(response.data)
                dispatch(clearLoading())
            })
            .catch(e => {
                console.log("error", e)
                dispatch(clearLoading())
                dispatch(setAlert({
                    message: e.response?.data?.error || 'Error al cargar los detalles del rol',
                    type: 'error'
                }))
            })
    }

    const hasPermission = (entity, action) => {
        return role?.permissions?.includes(`${action}_${entity}`)
    }

    const getPermissionCount = (entity) => {
        return actions.filter(action => hasPermission(entity, action.id)).length
    }

    if (!role) return null

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollView}>
                <View style={styles.header}>
                    <Text style={styles.title}>{role.name}</Text>
                    <Text style={styles.description}>{role.description || 'Sin descripción'}</Text>
                </View>

                <View style={styles.permissionsContainer}>
                    <Text style={styles.sectionTitle}>Permisos</Text>
                    <View style={styles.table}>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.headerCell, styles.entityCell]}>Entidad</Text>
                            {actions.map(action => (
                                <Text key={action.id} style={styles.headerCell}>{action.name}</Text>
                            ))}
                        </View>

                        {entities.map(entity => (
                            <View key={entity.id} style={styles.tableRow}>
                                <View style={[styles.cell, styles.entityCell]}>
                                    <Text style={styles.entityText}>{entity.name}</Text>
                                    <Text style={styles.permissionCount}>
                                        {getPermissionCount(entity.id)}/{actions.length}
                                    </Text>
                                </View>
                                {actions.map(action => (
                                    <View key={`${entity.id}-${action.id}`} style={styles.cell}>
                                        <View
                                            style={[
                                                styles.checkbox,
                                                hasPermission(entity.id, action.id) && styles.checkboxChecked
                                            ]}
                                        />
                                    </View>
                                ))}
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    text="Modificar Rol"
                    onPress={() => navigation.navigate('EditRole', { id, name: role.name })}
                    width="100%"
                />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollView: {
        flex: 1,
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    title: {
        fontSize: 24,
        fontFamily: 'Cairo-Bold',
        color: '#252525',
        marginBottom: 8,
    },
    description: {
        fontSize: 16,
        color: '#64748b',
    },
    permissionsContainer: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Cairo-Bold',
        color: '#252525',
        marginBottom: 16,
    },
    table: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 6,
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        padding: 8,
    },
    headerCell: {
        flex: 1,
        textAlign: 'center',
        fontWeight: '600',
        fontSize: 12,
        color: '#64748b',
    },
    entityCell: {
        flex: 1,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        padding: 8,
    },
    cell: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    entityText: {
        fontSize: 14,
        color: '#64748b',
    },
    permissionCount: {
        fontSize: 12,
        color: '#799351',
        marginTop: 4,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderWidth: 1,
        borderColor: '#799351',
        borderRadius: 4,
    },
    checkboxChecked: {
        backgroundColor: '#799351',
        borderColor: '#799351',
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        backgroundColor: '#fff',
    },
}); 