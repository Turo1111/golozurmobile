import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Platform, AppState, useContext } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../utils/client';
import { OfflineContext } from '../context.js/contextOffline';

const NOTIFICATION_TASK = 'connection-check-task';
const PING_TASK = 'ping-check-task';
const SYNCPRODUCT_TASK = 'sync-product-task';

// Configurar el manejador de notificaciones
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

// Función para hacer ping al servidor
async function ping() {
    try {
        const response = await axios.get('https://apigolozur.onrender.com/ping', { timeout: 5000 });
        console.log('Respuesta del ping:', response.data);
        return { success: true, data: response.data };
    } catch (error) {
        console.error('Error en ping:', error.message);
        return { success: false, error: error.message };
    }
}

async function postSale(saleInStorage) {
    apiClient.post('/sale/multiple', saleInStorage)
        .then(async (r) => {
            await AsyncStorage.removeItem('saleStorage')
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Servidor Golozur',
                    body: '✅ Ventas enviadas correctamente',
                },
                trigger: null,
            });
        })
        .catch(async (e) => {
            console.log('error post sale multiple', e)
            await AsyncStorage.removeItem('saleStorage')
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Servidor Golozur',
                    body: '❌ No se pudo enviar las ventas',
                },
                trigger: null,
            });
        })
}

async function getDateProduct() {
    try {
        const response = await apiClient.get('/product/get/ultimas-fechas');
        return response.data;
    } catch (error) {
        console.error('Error al obtener las últimas fechas del producto:', error.message);
        return null;
    }
}

async function getProduct() {
    console.log('getProduct')
    try {
        const response = await apiClient.get('/product');
        return response.data;
    } catch (error) {
        console.error('Error al obtener los productos:', error.message);
        return null;
    }
}

// Función para enviar notificación con el resultado del ping
async function sendPingNotification() {
    const pingResult = await ping();
    const saleInStorage = await AsyncStorage.getItem('saleStorage')
    const saleInStorageParsed = JSON.parse(saleInStorage)

    if (pingResult.success) {
        if (saleInStorageParsed.length > 0) {
            console.log('Hay ventas en el storage')
            postSale(saleInStorageParsed)
            return
        }
    }
}

async function syncProduct() {
    const pingResult = await ping();
    if (pingResult.success) {
        const productInStorage = await AsyncStorage.getItem('productStorage')
        const productInStorageParsed = JSON.parse(productInStorage)
        const dateProduct = await getDateProduct()
        if (productInStorageParsed?.product?.length > 0) {
            console.log('Hay productos en el storage')
            console.log('ultimo update', productInStorageParsed?.lastUpdate)
            console.log('ultima fecha', dateProduct)
            // Sumar 3 horas a la fecha de lastUpdate
            const lastUpdate = new Date(productInStorageParsed?.lastUpdate);
            lastUpdate.setHours(lastUpdate.getHours());
            if (productInStorageParsed?.lastUpdate < dateProduct?.ultimaUpdatedAt || productInStorageParsed?.lastUpdate < dateProduct?.ultimaCreatedAt) {
                console.log('Hay productos nuevos')
                const listProduct = await getProduct()
                const productStorage = {
                    product: listProduct,
                    lastUpdate: new Date().toISOString()
                }
                await AsyncStorage.setItem('productStorage', JSON.stringify(productStorage))
                return
            } else {
                console.log('No hay productos nuevos')
            }
            return
        }
        console.log('No hay productos en el storage')
        const listProduct = await getProduct()
        const productStorage = {
            product: listProduct,
            lastUpdate: new Date().toISOString()
        }
        await AsyncStorage.setItem('productStorage', JSON.stringify(productStorage))
        return
    }
}


// Definir tarea en segundo plano para el ping
TaskManager.defineTask(PING_TASK, async () => {
    try {
        await sendPingNotification();
        return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (err) {
        console.error('Error en verificación de ping:', err);
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
});

TaskManager.defineTask(SYNCPRODUCT_TASK, async () => {
    try {
        await syncProduct();
        return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (err) {
        console.error('Error en sincronización de productos:', err);
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
});

// Configurar notificaciones
export async function configureNotifications() {
    // Solicitar permisos
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('No se concedieron permisos para las notificaciones');
        return false;
    }

    // Configurar canal para Android
    if (Platform.OS === 'android') {

        // Canal para notificaciones de ping
        await Notifications.setNotificationChannelAsync('ping', {
            name: 'Estado del Servidor',
            description: 'Notificaciones sobre el estado del servidor',
            importance: Notifications.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 250, 250, 250],
        });
    }

    return true;
}

// Registrar tarea en segundo plano para ping
export async function registerBackgroundPingTask() {
    try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(PING_TASK);

        if (!isRegistered) {
            await BackgroundFetch.registerTaskAsync(PING_TASK, {
                minimumInterval: 60 * 5, // 1 minuto
                stopOnTerminate: false,
                startOnBoot: true,
            });
            console.log('Tarea de verificación de ping registrada');
        }
    } catch (error) {
        console.error('Error al registrar tarea de ping:', error);
    }
}

export async function registerBackgroundSyncProductTask() {
    try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(SYNCPRODUCT_TASK);

        if (!isRegistered) {
            await BackgroundFetch.registerTaskAsync(SYNCPRODUCT_TASK, {
                minimumInterval: 60, // 1 minuto
                stopOnTerminate: false,
                startOnBoot: true,
            });
        }
    } catch (error) {
        console.error('Error al registrar tarea de sincronización de productos:', error);
    }
}

// Variables para almacenar los IDs de los intervalos
let pingCheckInterval = null;
let syncProductInterval = null;

// Iniciar verificaciones de ping cada 30 segundos
export function startPingChecks() {
    if (pingCheckInterval) {
        clearInterval(pingCheckInterval);
    }

    // Ejecutar una vez inmediatamente
    sendPingNotification();

    pingCheckInterval = setInterval(async () => {
        if (AppState.currentState === 'active') {
            await sendPingNotification();
        }
    }, 600000); // 10 minutos (600000 ms)
}

export function startSyncProductChecks() {

    if (syncProductInterval) {
        clearInterval(syncProductInterval);
    }

    syncProductInterval = setInterval(async () => {
        if (AppState.currentState === 'active') {
            await syncProduct();
        }
    }, 60000); // 1 minuto (60000 ms)
}

// Detener verificaciones de ping
export function stopPingChecks() {
    if (pingCheckInterval) {
        clearInterval(pingCheckInterval);
        pingCheckInterval = null;
    }
}

export function stopSyncProductChecks() {
    if (syncProductInterval) {
        clearInterval(syncProductInterval);
        syncProductInterval = null;
    }
}

// Inicializar sistema de notificaciones
export async function initNotificationSystem() {
    const permissionsGranted = await configureNotifications();

    if (permissionsGranted) {
        // Registrar tareas en segundo plano
        await registerBackgroundPingTask();
        await registerBackgroundSyncProductTask();
        // Iniciar verificaciones en primer plano
        startPingChecks();
        startSyncProductChecks();
        // Escuchar cambios en el estado de la aplicación
        AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                startPingChecks();
                startSyncProductChecks();
            } else {
                stopPingChecks();
                stopSyncProductChecks();
            }
        });
    }

    return permissionsGranted;
} 