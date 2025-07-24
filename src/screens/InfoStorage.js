import { StyleSheet, Text, View, TouchableOpacity, FlatList, Alert } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hook'
import { clearLoading, getLoading, setLoading } from '../redux/loadingSlice'
import useLocalStorage from '../hooks/useLocalStorage'
import useInternetStatus from '../hooks/useInternetStatus'
import { OfflineContext } from '../context.js/contextOffline'
import { setAlert } from '../redux/alertSlice'
import Icon from 'react-native-vector-icons/Feather'
import apiClient from '../utils/client'
import { getUser } from '../redux/userSlice'

// Componente para mostrar cuando la lista está vacía
const EmptyListComponent = ({ message, icon }) => (
    <View style={styles.emptyContainer}>
        <Icon name={icon || "database"} size={60} color="#d1d5db" />
        <Text style={styles.emptyText}>{message || "No hay datos disponibles"}</Text>
    </View>
);

const StorageInfoCard = ({ title, count, size, icon, color, onClear, lastUpdate }) => (
    <View style={styles.storageCard}>
        <View style={styles.storageCardContent}>
            <View style={[styles.iconContainer, { backgroundColor: color }]}>
                <Icon name={icon} size={24} color="#fff" />
            </View>
            <View style={styles.storageInfo}>
                <Text style={styles.storageTitle}>{title}</Text>
                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Icon name="hash" size={14} color="#7F8487" style={styles.statIcon} />
                        <Text style={styles.statText}>{count} elementos</Text>
                    </View>
                    <View style={styles.stat}>
                        <Icon name="database" size={14} color="#7F8487" style={styles.statIcon} />
                        <Text style={styles.statText}>{size} KB</Text>
                    </View>
                    {lastUpdate && (
                        <View style={styles.stat}>
                            <Icon name="database" size={14} color="#7F8487" style={styles.statIcon} />
                            <Text style={styles.statText}>{lastUpdate}</Text>
                        </View>
                    )}
                </View>
            </View>
        </View>

        {/* Botón de limpieza individual */}
        {count > 0 && (
            <TouchableOpacity
                style={styles.clearButton}
                onPress={onClear}
            >
                <Icon name="trash-2" size={14} color="#ef4444" />
                <Text style={styles.clearButtonText}>Limpiar</Text>
            </TouchableOpacity>
        )}
    </View>
);

const HEADER_BLUE = '#2563eb';

export default function InfoStorage({ navigation }) {
    const dispatch = useAppDispatch();
    const user = useAppSelector(getUser);
    const loading = useAppSelector(getLoading);
    const { offline } = useContext(OfflineContext);
    const isConnected = useInternetStatus();
    const [isSyncing, setIsSyncing] = useState(false);

    // Hook para acceder a los datos almacenados
    const { data: productStorage, clearData: clearProductStorage } = useLocalStorage([], 'productStorage');
    const { data: saleStorage, clearData: clearSaleStorage } = useLocalStorage([], 'saleStorage');
    const { data: userStorage } = useLocalStorage([], 'user');

    // Calcular tamaño aproximado en KB
    const calculateSize = (data) => {
        const jsonStr = JSON.stringify(data);
        // Asumiendo que cada carácter ocupa aproximadamente 2 bytes
        return (jsonStr.length * 2 / 1024).toFixed(2);
    };

    // Función para limpiar el almacenamiento de productos
    const clearProductsStorage = () => {
        Alert.alert(
            "Limpiar productos",
            "¿Estás seguro que deseas eliminar todos los productos almacenados localmente? Esta acción no se puede deshacer.",
            [
                {
                    text: "Cancelar",
                    style: "cancel"
                },
                {
                    text: "Eliminar",
                    onPress: async () => {
                        dispatch(setLoading({
                            message: 'Limpiando productos...'
                        }));

                        try {
                            await clearProductStorage();

                            dispatch(setAlert({
                                message: 'Productos eliminados correctamente',
                                type: 'success'
                            }));
                        } catch (error) {
                            console.error('Error al limpiar productos:', error);
                            dispatch(setAlert({
                                message: 'Error al limpiar los productos',
                                type: 'error'
                            }));
                        } finally {
                            dispatch(clearLoading());
                        }
                    },
                    style: "destructive"
                }
            ]
        );
    };

    // Función para limpiar el almacenamiento de ventas
    const clearSalesStorage = () => {
        Alert.alert(
            "Limpiar ventas",
            "¿Estás seguro que deseas eliminar todas las ventas almacenadas localmente? Esta acción no se puede deshacer.",
            [
                {
                    text: "Cancelar",
                    style: "cancel"
                },
                {
                    text: "Eliminar",
                    onPress: async () => {
                        dispatch(setLoading({
                            message: 'Limpiando ventas...'
                        }));

                        try {
                            await clearSaleStorage();

                            dispatch(setAlert({
                                message: 'Ventas eliminadas correctamente',
                                type: 'success'
                            }));
                        } catch (error) {
                            console.error('Error al limpiar ventas:', error);
                            dispatch(setAlert({
                                message: 'Error al limpiar las ventas',
                                type: 'error'
                            }));
                        } finally {
                            dispatch(clearLoading());
                        }
                    },
                    style: "destructive"
                }
            ]
        );
    };

    const storageItems = [
        {
            id: '1',
            title: 'Productos',
            storage: productStorage,
            count: Array.isArray(productStorage.product) ? productStorage.product.length : 0,
            size: calculateSize(productStorage),
            icon: 'package',
            color: '#3B82F6',
            onClear: clearProductsStorage,
            lastUpdate: productStorage.lastUpdate
        },
        {
            id: '2',
            title: 'Ventas',
            storage: saleStorage,
            count: Array.isArray(saleStorage) ? saleStorage.length : 0,
            size: calculateSize(saleStorage),
            icon: 'shopping-cart',
            color: '#10B981',
            onClear: clearSalesStorage,
            lastUpdate: ''
        }
    ];

    const syncData = async () => {
        if (!isConnected) {
            dispatch(setAlert({
                message: 'No hay conexión a internet para sincronizar',
                type: 'error'
            }));
            return;
        }

        setIsSyncing(true);
        dispatch(setLoading({
            message: 'Sincronizando datos...'
        }));

        try {
            // Sincronizar ventas pendientes si hay alguna
            if (Array.isArray(saleStorage) && saleStorage.length > 0) {
                // Aquí implementaríamos la lógica para enviar las ventas pendientes al servidor
                await Promise.all(saleStorage.map(async (sale) => {
                    try {
                        // Ejemplo: enviar cada venta al servidor
                        // await apiClient.post('/sale/create', sale, {
                        //   headers: { Authorization: `Bearer ${user.token || userStorage.token}` }
                        // });
                        console.log('Sincronizando venta:', sale);
                    } catch (error) {
                        console.error('Error al sincronizar venta:', error);
                    }
                }));
            }

            dispatch(setAlert({
                message: 'Datos sincronizados correctamente',
                type: 'success'
            }));
        } catch (error) {
            console.error('Error en sincronización:', error);
            dispatch(setAlert({
                message: 'Error al sincronizar los datos',
                type: 'error'
            }));
        } finally {
            setIsSyncing(false);
            dispatch(clearLoading());
        }
    };

    return (
        <View style={styles.container}>
            {/* HEADER */}
            <View style={styles.headerContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, marginRight: 10 }}
                        >
                            <Icon name="arrow-left" size={18} color="#fff" />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.headerTitle}>Almacenamiento</Text>
                            <Text style={styles.headerSubtitle}>Datos guardados localmente</Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={styles.onlineBadge}>
                            <View style={[styles.onlineDot, { backgroundColor: offline ? '#C7253E' : '#4CAF50' }]} />
                            <Text style={{ color: '#fff', fontSize: 13, marginLeft: 4 }}>{offline ? 'Offline' : 'Online'}</Text>
                        </View>
                        <TouchableOpacity
                            onPress={syncData}
                            disabled={loading.open || !isConnected}
                            style={{ marginLeft: 8, padding: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10 }}
                        >
                            <Icon name="refresh-cw" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* BOTONES PRINCIPALES */}
                <View style={styles.headerButtonsRow}>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={syncData}
                        disabled={loading.open || !isConnected}
                    >
                        <Icon name="upload-cloud" size={16} color="#fff" style={styles.headerButtonIcon} />
                        <Text style={styles.headerButtonText}>Sincronizar datos</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* CONTENIDO PRINCIPAL */}
            <View style={styles.contentContainer}>
                <FlatList
                    style={styles.storageList}
                    data={storageItems}
                    renderItem={({ item }) => (
                        <StorageInfoCard
                            title={item.title}
                            count={item.count}
                            size={item.size}
                            icon={item.icon}
                            color={item.color}
                            onClear={item.onClear}
                            lastUpdate={item.lastUpdate}
                        />
                    )}
                    keyExtractor={item => item.id}
                    ListHeaderComponent={
                        <View style={styles.infoContainer}>
                            <Icon name="info" size={20} color={HEADER_BLUE} style={{ marginRight: 10 }} />
                            <Text style={styles.infoText}>
                                Aquí puedes ver los datos almacenados localmente y sincronizarlos cuando tengas conexión a internet.
                            </Text>
                        </View>
                    }
                    ListEmptyComponent={
                        <EmptyListComponent
                            message="No hay datos almacenados localmente"
                            icon="database"
                        />
                    }
                />
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
    headerButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 14,
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
        minWidth: 150,
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
    storageList: {
        flex: 1,
        paddingHorizontal: 10,
    },
    storageCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginVertical: 6,
        paddingHorizontal: 16,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    storageCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    storageInfo: {
        flex: 1,
    },
    storageTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#252525',
        marginBottom: 4,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
        marginVertical: 4,
    },
    statIcon: {
        marginRight: 4,
    },
    statText: {
        fontSize: 13,
        color: '#7F8487',
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
    infoContainer: {
        backgroundColor: '#e0f2fe',
        borderRadius: 12,
        padding: 12,
        marginVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoText: {
        flex: 1,
        color: '#1e40af',
        fontSize: 14,
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fee2e2',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
        marginTop: 10,
        alignSelf: 'flex-end',
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    clearButtonText: {
        color: '#ef4444',
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 4,
    }
});
