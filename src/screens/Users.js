import { ActivityIndicator, FlatList, StyleSheet, Text, View, TouchableOpacity, TextInput } from 'react-native'
import React, { useCallback, useContext, useEffect, useRef } from 'react'
import { clearUser } from '../redux/userSlice';
import { useAppDispatch } from '../redux/hook';
import { useInputValue } from '../hooks/useInputValue'
import useLocalStorage from '../hooks/useLocalStorage';
import useInternetStatus from '../hooks/useInternetStatus';
import { OfflineContext } from '../context.js/contextOffline';
import { setAlert } from '../redux/alertSlice';
import usePermissionCheck from '../hooks/usePermissionCheck';
import Icon from 'react-native-vector-icons/Feather';
import useAdminEntityListController from '../hooks/useAdminEntityListController';

const renderUserItem = ({ item, navigation, isConnected }) => {
    // Determinar color basado en el rol
    const getRoleColor = (roleName) => {
        switch (roleName) {
            default:
                return '#7F8487';
        }
    };

    const roleColor = getRoleColor(item.nameRole);

    return (
        <TouchableOpacity
            style={[styles.userCard, { backgroundColor: item.isActive ? '#fff' : '#FFB3B3' }]}
            onPress={() => {
                if (!isConnected) return;
                navigation.navigate('EditUser', { id: item._id, name: item.nickname })
            }}
            disabled={!isConnected}
        >
            <View style={[styles.userCardContent]}>
                {/* Avatar/Icono */}
                <View style={styles.userIconContainer}>
                    <Icon name="user" size={24} color="#fff" />
                </View>

                {/* Información principal */}
                <View style={styles.userInfo}>
                    <View style={styles.userNameRow}>
                        <Text style={[styles.userName, { color: item.isActive ? '#252525' : '#C7253E' }]}>{item.nickname}</Text>
                        <View style={[styles.roleTag, { backgroundColor: `${roleColor}22`, borderColor: roleColor }]}>
                            <Text style={[styles.roleText, { color: roleColor }]}>{item.nameRole || 'Sin rol'}</Text>
                        </View>
                    </View>

                    <View style={styles.userStatsRow}>
                        <View style={styles.userStat}>
                            <Icon name="shopping-bag" size={14} color="#7F8487" style={styles.statIcon} />
                            <Text style={styles.statText}>Ventas: {item.qtySaleUser || 0}</Text>
                        </View>
                        <View style={styles.userStat}>
                            <Icon name="dollar-sign" size={14} color="#799351" style={styles.statIcon} />
                            <Text style={[styles.statText, { color: '#799351' }]}>Ganancia: ${item?.gain?.toFixed(2) || 0}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Botón de editar */}
            {/* <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation.navigate('EditUser', { id: item._id, name: item.nickname })}
            >
                <Icon name="chevron-right" size={20} color="#b0b0b0" />
            </TouchableOpacity> */}
        </TouchableOpacity>
    );
}

// Componente para mostrar cuando la lista está vacía
const EmptyListComponent = ({ message, icon }) => (
    <View style={styles.emptyContainer}>
        <Icon name={icon || "users"} size={60} color="#d1d5db" />
        <Text style={styles.emptyText}>{message || "No hay usuarios disponibles"}</Text>
    </View>
);

const HEADER_BLUE = '#2563eb';
export default function Users({ navigation }) {
    const { clearData } = useLocalStorage([], 'user')
    const dispatch = useAppDispatch();
    const isConnected = useInternetStatus();
    const search = useInputValue('', '')
    const { offline } = useContext(OfflineContext)
    const errorRef = useRef(null)
    const {
        query,
        state,
        loadInitial,
        setSearch,
        loadNextPage,
        refresh,
        retry,
    } = useAdminEntityListController({ entity: 'user', limit: 15 })

    const { hasPermission: hasPermissionReadUser, isLoading: isLoadingReadUser } = usePermissionCheck('read_user', () => { })
    const { hasPermission: hasPermissionCreateUser } = usePermissionCheck('create_user', () => { })

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
            console.log('error user', error?.response?.data || error?.message || error);
        }
    }, [offline]);

    const refreshUsers = useCallback(() => {
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

            refreshUsers()
        });

        return unsubscribe
    }, [loadInitial, navigation, offline, refreshUsers, runControllerAction, state.status]);

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

    if (isLoadingReadUser || !hasPermissionReadUser) {
        return null
    }

    const renderListEmpty = () => {
        if (state.status === 'initial-loading') {
            return (
                <View style={styles.emptyState}>
                    <ActivityIndicator size="small" color="#2563eb" />
                    <Text style={styles.emptyStateText}>Cargando usuarios...</Text>
                </View>
            )
        }

        if (state.status === 'error') {
            return (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>{state.error || 'No se pudo cargar la lista de usuarios'}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => runControllerAction(retry)}>
                        <Text style={styles.retryButtonText}>Reintentar</Text>
                    </TouchableOpacity>
                </View>
            )
        }

        return (
            <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No hay usuarios para la consulta actual</Text>
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
                    style={styles.usersList}
                    data={state.items}
                    renderItem={({ item }) => renderUserItem({ item, navigation, isConnected })}
                    keyExtractor={(item) => item._id.toString()}
                    contentContainerStyle={[
                        styles.listContentContainer,
                        state.items.length === 0 && styles.emptyListContainer
                    ]}
                    ListEmptyComponent={renderListEmpty}
                    ListFooterComponent={renderListFooter}
                    refreshing={state.status === 'refreshing'}
                    onRefresh={refreshUsers}
                    onEndReached={() => runControllerAction(loadNextPage)}
                    onEndReachedThreshold={0.5}
                />
            );
        } else {
            return (
                <EmptyListComponent message="No hay datos disponibles sin conexión" icon="wifi-off" />
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
                            <Text style={styles.headerTitle}>Usuarios</Text>
                            <Text style={styles.headerSubtitle}>Gestión de usuarios</Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={styles.onlineBadge}>
                            <View style={[styles.onlineDot, { backgroundColor: offline ? '#C7253E' : '#4CAF50' }]} />
                            <Text style={{ color: '#fff', fontSize: 13, marginLeft: 4 }}>{offline ? 'Offline' : 'Online'}</Text>
                        </View>
                        <TouchableOpacity onPress={refreshUsers} style={{ marginLeft: 8, padding: 4, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10 }}>
                            <Icon name="refresh-cw" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
                {/* SEARCH BAR */}
                <View style={styles.searchBarContainer}>
                    <Icon name="search" size={18} color="#7F8487" style={{ marginLeft: 10 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar usuarios por nombre o rol..."
                        placeholderTextColor="#b0b0b0"
                        {...search}
                    />
                </View>
                {/* BOTONES PRINCIPALES */}
                {
                    !offline && (
                        <View style={styles.headerButtonsRow}>
                            {hasPermissionCreateUser && (
                                <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('NewUser')}>
                                    <Icon name="user-plus" size={14} color="#fff" style={styles.headerButtonIcon} />
                                    <Text style={styles.headerButtonText}>Nuevo usuario</Text>
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
    usersList: {
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
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyStateText: {
        fontSize: 15,
        color: '#7F8487',
        marginTop: 10,
        textAlign: 'center',
        paddingHorizontal: 24,
    },
    retryButton: {
        backgroundColor: '#2563eb',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginTop: 14,
    },
    retryButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    footerLoader: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    userCard: {
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
    userCardContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    userIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    userInfo: {
        flex: 1,
    },
    userNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#252525',
    },
    roleTag: {
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderWidth: 1,
    },
    roleText: {
        fontSize: 12,
        fontWeight: '600',
    },
    userStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginTop: 2,
    },
    userStat: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    statIcon: {
        marginRight: 4,
    },
    statText: {
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
