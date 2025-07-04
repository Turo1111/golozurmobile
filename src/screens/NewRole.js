import React, { useState, useContext } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native'
import { useAppDispatch, useAppSelector } from '../redux/hook'
import { getUser } from '../redux/userSlice'
import { setLoading, clearLoading } from '../redux/loadingSlice'
import { setAlert } from '../redux/alertSlice'
import apiClient from '../utils/client'
import useLocalStorage from '../hooks/useLocalStorage'
import Button from '../components/Button'
import usePermissionCheck from '../hooks/usePermissionCheck'
import Icon from 'react-native-vector-icons/Feather'
import { OfflineContext } from '../context.js/contextOffline'

const HEADER_BLUE = '#2563eb';

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
    const { offline } = useContext(OfflineContext)
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
        <View style={styles.container}>
            {/* HEADER */}
            <View style={styles.headerContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, marginRight: 10 }}>
                            <Icon name="arrow-left" size={18} color="#fff" />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.headerTitle}>Nuevo Rol</Text>
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
                {/* INFORMACIÓN BÁSICA */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIcon, { backgroundColor: '#EBF5FF' }]}>
                            <Icon name="info" size={18} color="#2563eb" />
                        </View>
                        <Text style={styles.sectionTitle}>Información Básica</Text>
                    </View>

                    <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>Nombre del Rol *</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.name}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                            placeholder="Ingrese el nombre del rol"
                        />
                    </View>

                    <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>Descripción</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={formData.description}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                            placeholder="Ingrese una descripción para el rol"
                            multiline
                            numberOfLines={4}
                        />
                    </View>
                </View>

                {/* PERMISOS */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIcon, { backgroundColor: '#ECFDF5' }]}>
                            <Icon name="shield" size={18} color="#10B981" />
                        </View>
                        <Text style={styles.sectionTitle}>Permisos</Text>
                    </View>

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
                                        >
                                            {isPermissionChecked(entity.id, action.id) && (
                                                <Icon name="check" size={14} color="#fff" />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        ))}
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
                    onPress={handleSubmit}
                >
                    <Icon name="save" size={16} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Guardar</Text>
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
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    table: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        padding: 12,
    },
    headerCell: {
        flex: 1,
        textAlign: 'center',
        fontWeight: '600',
        fontSize: 13,
        color: '#64748b',
    },
    entityCell: {
        flex: 1,
        paddingLeft: 6,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        padding: 12,
    },
    cell: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkbox: {
        width: 22,
        height: 22,
        borderWidth: 1,
        borderColor: '#2366CB',
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#2366CB',
        borderColor: '#2366CB',
    },
    entityText: {
        fontSize: 14,
        color: '#64748b',
    },
    entityTextChecked: {
        color: '#2366CB',
        fontWeight: '600',
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