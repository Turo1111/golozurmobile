import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native'
import { useAppDispatch, useAppSelector } from '../redux/hook'
import { getUser } from '../redux/userSlice'
import { setLoading, clearLoading } from '../redux/loadingSlice'
import { setAlert } from '../redux/alertSlice'
import apiClient from '../utils/client'
import useLocalStorage from '../hooks/useLocalStorage'
import Button from '../components/Button'
import usePermissionCheck from '../hooks/usePermissionCheck'

const entities = [
    { id: "user", name: "Usuarios" },
    { id: "role", name: "Roles" },
    { id: "product", name: "Productos" },
    { id: "sale", name: "Ventas" },
    { id: "buy", name: "Compras" },
    { id: "client", name: "Clientes" },
]

const actions = [
    { id: "create", name: "Crear" },
    { id: "read", name: "Visualizar" },
    { id: "update", name: "Modificar" },
    { id: "delete", name: "Borrar" },
]

export default function NewRole({ navigation }) {
    const user = useAppSelector(getUser)
    const { data: userStorage } = useLocalStorage([], 'user')
    const dispatch = useAppDispatch()
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        permissions: [],
        isActive: true
    })

    const { hasPermission: hasPermissionCreateRole, isLoading: isLoadingCreateRole } = usePermissionCheck('create_role', () => { })

    const handlePermissionChange = (entity, action, checked) => {
        const permission = `${action}_${entity}`
        const currentPermissions = formData.permissions || []

        if (checked) {
            setFormData(prev => ({
                ...prev,
                permissions: [...currentPermissions, permission]
            }))
        } else {
            setFormData(prev => ({
                ...prev,
                permissions: currentPermissions.filter(p => p !== permission)
            }))
        }
    }

    const handleEntityToggle = (entity) => {
        const entityPermissions = actions.map(action => `${action.id}_${entity}`)
        const currentPermissions = formData.permissions || []

        // Check if all permissions for this entity are already selected
        const allSelected = entityPermissions.every(permission =>
            currentPermissions.includes(permission)
        )

        if (allSelected) {
            // If all are selected, remove all permissions for this entity
            setFormData(prev => ({
                ...prev,
                permissions: currentPermissions.filter(p => !entityPermissions.includes(p))
            }))
        } else {
            // If not all are selected, add all permissions for this entity
            const newPermissions = [...currentPermissions]
            entityPermissions.forEach(permission => {
                if (!newPermissions.includes(permission)) {
                    newPermissions.push(permission)
                }
            })
            setFormData(prev => ({
                ...prev,
                permissions: newPermissions
            }))
        }
    }

    const isPermissionChecked = (entity, action) => {
        return (formData.permissions || []).includes(`${action}_${entity}`)
    }

    const isEntityFullyChecked = (entity) => {
        return actions.every(action => isPermissionChecked(entity, action.id))
    }

    const handleSubmit = () => {
        if (formData.name === '') {
            dispatch(setAlert({
                message: 'El nombre del rol es obligatorio',
                type: 'error'
            }))
            return
        }

        dispatch(setLoading({
            message: 'Creando rol'
        }))

        console.log(formData)

        apiClient.post('/role', formData, {
            headers: {
                Authorization: `Bearer ${user.token || userStorage.token}`
            },
        })
            .then(() => {
                dispatch(clearLoading())
                dispatch(setAlert({
                    message: 'Rol creado correctamente',
                    type: 'success'
                }))
                navigation.navigate('Roles')
            })
            .catch(e => {
                console.log('error', e);
                dispatch(clearLoading())
                dispatch(setAlert({
                    message: `${e.response?.data || 'Ocurrio un error'}`,
                    type: 'error'
                }))
            })
    }

    if (isLoadingCreateRole || !hasPermissionCreateRole) {
        return null
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Nombre del Rol *</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.name}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                        placeholder="Ingrese el nombre del rol"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Descripción</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={formData.description}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                        placeholder="Ingrese una descripción para el rol"
                        multiline
                        numberOfLines={4}
                    />
                </View>

                <View style={styles.permissionsContainer}>
                    <Text style={styles.label}>Permisos</Text>
                    <View style={styles.table}>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.headerCell, styles.entityCell]}>Entidad</Text>
                            {actions.map(action => (
                                <Text key={action.id} style={styles.headerCell}>{action.name}</Text>
                            ))}
                        </View>

                        {entities.map(entity => (
                            <View key={entity.id} style={styles.tableRow}>
                                <TouchableOpacity
                                    style={[styles.cell, styles.entityCell]}
                                    onPress={() => handleEntityToggle(entity.id)}
                                >
                                    <Text style={[
                                        styles.entityText,
                                        isEntityFullyChecked(entity.id) && styles.entityTextChecked
                                    ]}>{entity.name}</Text>
                                </TouchableOpacity>
                                {actions.map(action => (
                                    <View key={`${entity.id}-${action.id}`} style={styles.cell}>
                                        <TouchableOpacity
                                            style={[
                                                styles.checkbox,
                                                isPermissionChecked(entity.id, action.id) && styles.checkboxChecked
                                            ]}
                                            onPress={() => handlePermissionChange(
                                                entity.id,
                                                action.id,
                                                !isPermissionChecked(entity.id, action.id)
                                            )}
                                        />
                                    </View>
                                ))}
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.buttonContainer}>
                    <Button
                        text="Guardar"
                        onPress={handleSubmit}
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
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    permissionsContainer: {
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
    buttonContainer: {
        marginTop: 16,
    },
    entityText: {
        fontSize: 14,
        color: '#64748b',
    },
    entityTextChecked: {
        color: '#799351',
        fontWeight: '600',
    },
}); 