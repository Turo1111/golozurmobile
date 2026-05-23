import { ActivityIndicator, FlatList, StyleSheet, Text, View, TouchableOpacity, TextInput } from 'react-native'
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { clearUser } from '../redux/userSlice';
import { useAppDispatch } from '../redux/hook';
import { useInputValue } from '../hooks/useInputValue'
import { io } from 'socket.io-client';
import useLocalStorage from '../hooks/useLocalStorage';
import useInternetStatus from '../hooks/useInternetStatus';
import { OfflineContext } from '../context.js/contextOffline';
import { setAlert } from '../redux/alertSlice';
import usePermissionCheck from '../hooks/usePermissionCheck';
import Icon from 'react-native-vector-icons/Feather';
import Constants from 'expo-constants';
import ReadOnlyClientMapModal from '../components/ReadOnlyClientMapModal'
import useAdminEntityListController from '../hooks/useAdminEntityListController';

const DB_HOST = Constants.expoConfig?.extra?.DB_HOST;

const renderClientItem = ({ item, navigation, isConnected, onOpenMap }) => {
    return (
        <TouchableOpacity
            style={styles.clientCard}
            onPress={() => {
                if (!isConnected) return;
                navigation.navigate('EditClient', { id: item._id, name: item.nombreCompleto })
            }}
            disabled={!isConnected}
        >
            <View style={styles.clientCardContent}>
                {/* Icono */}
                <View style={styles.clientIconContainer}>
                    <Icon name="user" size={20} color="#fff" />
                </View>

                {/* Información principal */}
                <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{item.nombreCompleto}</Text>

                    <View style={styles.clientDetails}>

                        {!item.address && (item.lat && item.lng) && (
                            <View style={styles.clientDetail}>
                                <Icon name="map" size={12} color="#7F8487" style={styles.detailIcon} />
                                <Text style={styles.detailText}>
                                    Lat: {item.lat.toFixed ? item.lat.toFixed(5) : item.lat}, Lng: {item.lng.toFixed ? item.lng.toFixed(5) : item.lng}
                                </Text>
                            </View>
                        )}

                        {item.telefonos && item.telefonos.length > 0 && (
                            <View style={styles.clientDetail}>
                                <Icon name="phone" size={12} color="#799351" style={styles.detailIcon} />
                                <Text style={[styles.detailText, { color: '#799351' }]}>
                                    {item.telefonos[0]}
                                </Text>
                            </View>
                        )}

                        {item.address && (
                            <View style={styles.clientDetail}>
                                <Icon name="map" size={12} color="#2563eb" style={styles.detailIcon} />
                                <Text style={[styles.detailText, { color: '#2563eb' }]} numberOfLines={1}>
                                    {item.address}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>

            {/* Botón de editar */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                    style={[styles.editButton, { marginRight: 6 }]}
                    onPress={() => onOpenMap && onOpenMap(item)}
                >
                    <Icon name="map" size={18} color="#2563eb" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => navigation.navigate('EditClient', { id: item._id, name: item.nombreCompleto })}
                >
                    <Icon name="chevron-right" size={20} color="#b0b0b0" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
}

// Componente para mostrar cuando la lista está vacía
const EmptyListComponent = ({ message, icon }) => (
    <View style={styles.emptyContainer}>
        <Icon name={icon || "users"} size={60} color="#d1d5db" />
        <Text style={styles.emptyText}>{message || "No hay clientes disponibles"}</Text>
    </View>
);

const HEADER_BLUE = '#2563eb';

export default function Client({ navigation }) {
    const { clearData } = useLocalStorage([], 'user')
    const dispatch = useAppDispatch();
    const isConnected = useInternetStatus();
    const search = useInputValue('', '')
    const { offline } = useContext(OfflineContext)
    const errorRef = useRef(null)
    const [mapVisible, setMapVisible] = useState(false)
    const [mapClient, setMapClient] = useState(null) // { id, lat, lng, address }
    const {
        query,
        state,
        loadInitial,
        setSearch,
        loadNextPage,
        refresh,
        retry,
    } = useAdminEntityListController({ entity: 'client', limit: 15 })

    const { hasPermission: hasPermissionReadClient, isLoading: isLoadingReadClient } = usePermissionCheck('read_client', () => { })
    const { hasPermission: hasPermissionCreateClient } = usePermissionCheck('create_client', () => { })

    const logOut = async () => {
        try {
            await clearData();
            await dispatch(clearUser());
        } catch (error) {
            console.error(error);
        }
        navigation.navigate('Login');
    };

    const runControllerAction = useCallback(async (action) => {
        if (offline) {
            return;
        }

        try {
            await action();
        } catch (error) {
            console.log('error client', error?.response?.data || error?.message || error);
        }
    }, [offline]);

    /* useEffect(() => {
        const socket = io(DB_HOST)
        socket.on('client', (socket) => {
            setData((prevData) => {
                const exist = prevData.find((elem) => elem._id === socket.data._id)
                if (exist) {
                    return prevData.map((item) =>
                        item._id === socket.data._id ? socket.data : item
                    )
                }
                return [...prevData, { ...socket.data, _id: Math.floor(Math.random() * 1000000) }]
            })
        })
        return () => {
            socket.disconnect();
        };
    }, [data]) */

    const refreshClients = useCallback(() => {
        return runControllerAction(refresh);
    }, [refresh, runControllerAction]);

    useEffect(() => {
        if (offline) {
            return;
        }

        const normalizedSearch = String(search.value || '').trim()

        if (normalizedSearch === query.search) {
            return;
        }

        runControllerAction(() => setSearch(search.value));
    }, [offline, query.search, runControllerAction, search.value, setSearch]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            if (offline) {
                return;
            }

            if (state.status === 'idle') {
                runControllerAction(loadInitial)
                return;
            }

            refreshClients()
        });

        return unsubscribe
    }, [loadInitial, navigation, offline, refreshClients, runControllerAction, state.status]);

    useEffect(() => {
        if (state.status !== 'error' || !state.error) {
            errorRef.current = null
            return;
        }

        if (errorRef.current === state.error) {
            return;
        }

        errorRef.current = state.error

        if (state.error === 'USUARIO_NO_ACTIVO') {
            logOut()
            return;
        }

        dispatch(setAlert({
            message: `${state.error || 'Ocurrio un error'}`,
            type: 'error'
        }))
    }, [dispatch, state.error, state.status])

    if (isLoadingReadClient || !hasPermissionReadClient) {
        return null
    }

    const subscribeToClientLocation = (client) => (onLoc) => {
        try {
            const socket = io(DB_HOST)
            const clientId = client?._id || client?.id
            const handler = (payload) => {
                try {
                    const pid = payload?.clientId || payload?.cliente || payload?.id
                    if (clientId && pid && String(pid) !== String(clientId)) return
                    const lat = parseFloat(payload?.lat)
                    const lng = parseFloat(payload?.lng)
                    if (Number.isFinite(lat) && Number.isFinite(lng)) {
                        onLoc({ lat, lng, address: payload?.address })
                    }
                } catch (_) { }
            }
            socket.on('client_location', handler)
            return () => {
                try { socket.off('client_location', handler); socket.disconnect() } catch (_) { }
            }
        } catch (_) { return undefined }
    }

    const handleOpenMap = (item) => {
        if (!item?.lat || !item?.lng) return
        setMapClient({ id: item._id, lat: item.lat, lng: item.lng, address: item.address })
        setMapVisible(true)
    }

    const renderListEmpty = () => {
        if (state.status === 'initial-loading') {
            return (
                <View style={styles.emptyState}>
                    <ActivityIndicator size="small" color="#2563eb" />
                    <Text style={styles.emptyStateText}>Cargando clientes...</Text>
                </View>
            )
        }

        if (state.status === 'error') {
            return (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>{state.error || 'No se pudo cargar la lista de clientes'}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => runControllerAction(retry)}>
                        <Text style={styles.retryButtonText}>Reintentar</Text>
                    </TouchableOpacity>
                </View>
            )
        }

        return (
            <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No hay clientes para la consulta actual</Text>
            </View>
        )
    }

    const renderListFooter = () => {
        if (state.status !== 'paginating') {
            return <View style={{ height: 20 }} />
        }

        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#2563eb" />
            </View>
        )
    }

    const renderContent = () => {
        if (!offline) {
            return (
                <FlatList
                    style={styles.clientsList}
                    data={state.items}
                    renderItem={({ item }) => renderClientItem({ item, navigation, isConnected, onOpenMap: handleOpenMap })}
                    keyExtractor={(item) => item._id.toString()}
                    contentContainerStyle={[
                        styles.listContentContainer,
                        state.items.length === 0 && styles.emptyListContainer
                    ]}
                    ListEmptyComponent={renderListEmpty}
                    ListFooterComponent={renderListFooter}
                    refreshing={state.status === 'refreshing'}
                    onRefresh={refreshClients}
                    onEndReached={() => runControllerAction(loadNextPage)}
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
                            <Text style={styles.headerTitle}>Clientes</Text>
                            <Text style={styles.headerSubtitle}>Gestión de clientes</Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={styles.onlineBadge}>
                            <View style={[styles.onlineDot, { backgroundColor: offline ? '#C7253E' : '#4CAF50' }]} />
                            <Text style={{ color: '#fff', fontSize: 13, marginLeft: 4 }}>{offline ? 'Offline' : 'Online'}</Text>
                        </View>
                        <TouchableOpacity onPress={refreshClients} style={{ marginLeft: 8, padding: 4, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10 }}>
                            <Icon name="refresh-cw" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
                {/* SEARCH BAR */}
                <View style={styles.searchBarContainer}>
                    <Icon name="search" size={18} color="#7F8487" style={{ marginLeft: 10 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar clientes por nombre..."
                        placeholderTextColor="#b0b0b0"
                        {...search}
                    />
                </View>
                {/* BOTONES PRINCIPALES */}
                {
                    !offline && (
                        <View style={styles.headerButtonsRow}>
                            {hasPermissionCreateClient && (
                                <TouchableOpacity
                                    style={styles.headerButton}
                                    onPress={() => navigation.navigate('NewClient')}
                                >
                                    <Icon name="user-plus" size={14} color="#fff" style={styles.headerButtonIcon} />
                                    <Text style={styles.headerButtonText}>Nuevo cliente</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )
                }
            </View>

            {/* CONTENIDO PRINCIPAL */}
            <View style={styles.contentContainer}>
                {renderContent()}
            </View>
            <ReadOnlyClientMapModal
                visible={mapVisible}
                onClose={() => setMapVisible(false)}
                initialValue={mapClient ? { lat: mapClient.lat, lng: mapClient.lng, address: mapClient.address } : null}
                subscribeToLocation={mapClient ? subscribeToClientLocation(mapClient) : undefined}
            />
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
    clientsList: {
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
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
    },
    emptyStateText: {
        color: '#6b7280',
        fontSize: 14,
        marginTop: 10,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#2563eb',
        borderRadius: 8,
        marginTop: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    footerLoader: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    clientCard: {
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
    clientCardContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    clientIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    clientInfo: {
        flex: 1,
    },
    clientName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#252525',
        marginBottom: 6,
    },
    clientDetails: {
        flexDirection: 'column',
    },
    clientDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    detailIcon: {
        marginRight: 4,
    },
    detailText: {
        fontSize: 13,
        color: '#7F8487',
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
