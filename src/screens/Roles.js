import { FlatList, Pressable, StyleSheet, Text, View, TouchableOpacity, TextInput } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import apiClient from '../utils/client'
import { clearUser, getUser } from '../redux/userSlice';
import { useAppDispatch, useAppSelector } from '../redux/hook';
import { clearLoading, getLoading, setLoading } from '../redux/loadingSlice';
import Search from '../components/Search';
import Button from '../components/Button';
import { useInputValue } from '../hooks/useInputValue'
import { io } from 'socket.io-client';
import useLocalStorage from '../hooks/useLocalStorage';
import useInternetStatus from '../hooks/useInternetStatus';
import { OfflineContext } from '../context.js/contextOffline';
import useFilteredArray from '../hooks/useFilteredArray';
import { setAlert } from '../redux/alertSlice';
import usePermissionCheck from '../hooks/usePermissionCheck';
import Icon from 'react-native-vector-icons/Feather';
import Constants from 'expo-constants';

const DB_HOST = Constants.expoConfig?.extra?.DB_HOST;

const renderRoleItem = ({ item, navigation, isConnected }) => {
    // Determinar si es el rol admin (no editable)
    const isAdmin = item.name === 'admin';

    return (
        <TouchableOpacity
            style={styles.roleCard}
            onPress={() => {
                if (isAdmin || !isConnected) return;
                navigation.navigate('EditRole', {
                    id: item._id,
                    name: item.name,
                })
            }}
            disabled={isAdmin || !isConnected}
        >
            <View style={styles.roleCardContent}>
                {/* Icono */}
                <View style={[styles.roleIconContainer, isAdmin && { backgroundColor: '#FA9B50' }]}>
                    <Icon name="shield" size={20} color="#fff" />
                </View>

                {/* Información principal */}
                <View style={styles.roleInfo}>
                    <Text style={styles.roleName}>{item.name}</Text>
                    <Text style={styles.roleDescription}>{item.description || 'Sin descripción'}</Text>

                    {/* Permisos */}
                    <View style={styles.permissionsTag}>
                        <Icon name="check-square" size={12} color="#FA9B50" style={styles.permissionIcon} />
                        <Text style={styles.permissionsText}>{item.permissions?.length || 0} permisos</Text>
                    </View>
                </View>
            </View>

            {/* Botón de editar (no visible para admin) */}
            {!isAdmin && (
                <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => navigation.navigate('EditRole', {
                        id: item._id,
                        name: item.name,
                    })}
                >
                    <Icon name="chevron-right" size={20} color="#b0b0b0" />
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
}

// Componente para mostrar cuando la lista está vacía
const EmptyListComponent = ({ message, icon }) => (
    <View style={styles.emptyContainer}>
        <Icon name={icon || "shield"} size={60} color="#d1d5db" />
        <Text style={styles.emptyText}>{message || "No hay roles disponibles"}</Text>
    </View>
);

const HEADER_BLUE = '#2563eb';

export default function Roles({ navigation }) {
    const user = useAppSelector(getUser)
    const { data: userStorage, clearData } = useLocalStorage([], 'user')
    const loading = useAppSelector(getLoading)
    const dispatch = useAppDispatch();
    const [data, setData] = useState([])
    const [dataSearch, setDataSearch] = useState([])
    const [query, setQuery] = useState({ skip: 0, limit: 15 })
    const isConnected = useInternetStatus();
    const search = useInputValue('', '')
    const { offline } = useContext(OfflineContext)
    const [isLoading, setIsLoading] = useState(true)

    const { hasPermission: hasPermissionReadRole, isLoading: isLoadingReadRole } = usePermissionCheck('read_role', () => { })
    const { hasPermission: hasPermissionCreateRole, isLoading: isLoadingCreateRole } = usePermissionCheck('create_role', () => { })

    const logOut = async () => {
        try {
            await clearData();
            await dispatch(clearUser());
        } catch (error) {
            console.error(error);
        }
        navigation.navigate('Login');
    };

    const getRoles = (skip, limit) => {
        setIsLoading(true)
        dispatch(setLoading({
            message: `Actualizando roles`
        }))
        apiClient.post(`/role/skip`, { skip, limit },
            {
                headers: {
                    Authorization: `Bearer ${user.token || userStorage.token}`
                },
            })
            .then(response => {
                setData((prevData) => {
                    if (prevData) {
                        if (prevData.length === 0) {
                            return response.data.array
                        }
                        const newData = response.data.array.filter((element) => {
                            return prevData.findIndex((item) => item._id === element._id) === -1;
                        });
                        return [...prevData, ...newData];
                    }
                    return []
                })
                setIsLoading(false)
                dispatch(clearLoading())
            })
            .catch(e => {
                console.log("error", e);
                if (e.response.data === 'USUARIO_NO_ACTIVO') {
                    logOut()
                }
                dispatch(setAlert({
                    message: `${e.response?.data || 'Ocurrio un error'}`,
                    type: 'error'
                }))
                setIsLoading(false)
                dispatch(clearLoading())
            })
    }

    const getRolesSearch = (input) => {
        setIsLoading(true)
        apiClient.post(`/role/search`, { input },
            {
                headers: {
                    Authorization: `Bearer ${user.token || userStorage.token}`
                },
            }
        )
            .then(response => {
                setDataSearch(response.data)
                setIsLoading(false)
            })
            .catch(e => {
                console.log("error", e);
                if (e.response.data === 'USUARIO_NO_ACTIVO') {
                    logOut()
                }
                dispatch(setAlert({
                    message: `${e.response?.data || 'Ocurrio un error'}`,
                    type: 'error'
                }))
                setIsLoading(false)
                dispatch(clearLoading())
            })
    }

    useEffect(() => {
        if (!offline) {
            getRoles(query.skip, query.limit)
        }
    }, [query, offline, user.token, userStorage.token])

    useEffect(() => {
        if (search && !offline) {
            getRolesSearch(search.value)
        }
    }, [search.value])

    /* useEffect(() => {
        const socket = io(DB_HOST)
        socket.on(`role`, (socketData) => {
            setData((prevData) => {
                const exist = prevData.find((elem) => elem._id === socketData.data._id)
                if (exist) {
                    return prevData.map((item) =>
                        item._id === socketData.data._id ? socketData.data : item
                    )
                }
                return [...prevData, { ...socketData.data, _id: Math.floor(Math.random() * 1000000) }]
            })
        })
        return () => {
            socket.disconnect();
        };
    }, [data]) */

    const refreshRoles = () => {
        search.clearValue()
        if (!offline) {
            getRoles(0, 15)
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            refreshRoles()
        });

        return unsubscribe
    }, [navigation]);

    if (isLoadingReadRole || !hasPermissionReadRole) {
        return null
    }

    const renderContent = () => {
        if (!offline) {
            const displayData = search.value !== '' ? dataSearch : data;

            return (
                <FlatList
                    style={styles.rolesList}
                    data={displayData}
                    renderItem={({ item }) => renderRoleItem({ item, navigation, isConnected })}
                    keyExtractor={(item) => item._id.toString()}
                    contentContainerStyle={[
                        styles.listContentContainer,
                        displayData.length === 0 && styles.emptyListContainer
                    ]}
                    ListEmptyComponent={
                        <EmptyListComponent
                            message={isLoading ? "Cargando roles..." : "No hay roles disponibles"}
                            icon={isLoading ? "loader" : "shield"}
                        />
                    }
                    onEndReached={() => {
                        if (!loading.open && !isLoading) {
                            if (search.value === '') {
                                dispatch(setLoading({
                                    message: `Cargando nuevos roles`
                                }))
                                setQuery({ skip: query.skip + 15, limit: query.limit })
                            }
                        }
                    }}
                    onEndReachedThreshold={0.5}
                />
            );
        } else {
            // Modo sin conexión
            return (
                <View style={{ flex: 1 }}>
                    <Text style={styles.offlineMessage}>Estas en modo sin conexión</Text>
                    <EmptyListComponent message="No hay datos disponibles sin conexión" icon="wifi-off" />
                </View>
            );
        }
    };

    return (
        <View style={styles.container}>
            {/* HEADER NUEVO */}
            <View style={styles.headerContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, marginRight: 10 }}>
                            <Icon name="arrow-left" size={18} color="#fff" />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.headerTitle}>Roles</Text>
                            <Text style={styles.headerSubtitle}>Gestión de permisos</Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={styles.onlineBadge}>
                            <View style={[styles.onlineDot, { backgroundColor: offline ? '#C7253E' : '#4CAF50' }]} />
                            <Text style={{ color: '#fff', fontSize: 13, marginLeft: 4 }}>{offline ? 'Offline' : 'Online'}</Text>
                        </View>
                        <TouchableOpacity onPress={refreshRoles} style={{ marginLeft: 8, padding: 4, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10 }}>
                            <Icon name="refresh-cw" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
                {/* SEARCH BAR */}
                <View style={styles.searchBarContainer}>
                    <Icon name="search" size={18} color="#7F8487" style={{ marginLeft: 10 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar roles por nombre..."
                        placeholderTextColor="#b0b0b0"
                        {...search}
                    />
                </View>
                {/* BOTONES PRINCIPALES */}
                {
                    !offline && (
                        <View style={styles.headerButtonsRow}>
                            {hasPermissionCreateRole && (
                                <TouchableOpacity
                                    style={styles.headerButton}
                                    onPress={() => navigation.navigate('NewRole')}
                                >
                                    <Icon name="plus-circle" size={14} color="#fff" style={styles.headerButtonIcon} />
                                    <Text style={styles.headerButtonText}>Nuevo rol</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
            </View>

            {/* CONTENIDO PRINCIPAL */}
            <View style={styles.contentContainer}>
                {renderContent()}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f6f8fa',
    },
    contentContainer: {
        flex: 1,
        paddingTop: 10,
    },
    headerContainer: {
        backgroundColor: HEADER_BLUE,
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
    headerSubtitle: {
        color: '#e0e7ff',
        fontSize: 13,
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
    searchBarContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 15,
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
    headerButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 10,
    },
    headerButton: {
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 4,
        marginTop: 0,
        marginBottom: 0,
        minWidth: 110,
        justifyContent: 'center',
    },
    headerButtonIcon: {
        marginRight: 8,
    },
    headerButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    rolesList: {
        flex: 1,
    },
    listContentContainer: {
        paddingHorizontal: 10,
        paddingBottom: 20,
        minHeight: '100%',
    },
    emptyListContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#9ca3af',
        marginTop: 12,
        textAlign: 'center',
    },
    roleCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 6,
        paddingHorizontal: 16,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    roleCardContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    roleIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    roleInfo: {
        flex: 1,
    },
    roleName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#252525',
        marginBottom: 4,
        textTransform: 'capitalize'
    },
    roleDescription: {
        fontSize: 13,
        color: '#7F8487',
        marginBottom: 8,
    },
    permissionsTag: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    permissionIcon: {
        marginRight: 4,
    },
    permissionsText: {
        fontSize: 13,
        color: '#FA9B50',
        fontWeight: '600',
    },
    editButton: {
        backgroundColor: 'rgba(56, 47, 47, 0.05)',
        borderRadius: 10,
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    offlineMessage: {
        fontSize: 14,
        color: '#C7253E',
        paddingHorizontal: 15,
        paddingVertical: 6,
        backgroundColor: '#ffeeee',
        borderRadius: 8,
        marginHorizontal: 10,
        marginVertical: 8,
        textAlign: 'center',
        fontWeight: '500',
    }
}); 