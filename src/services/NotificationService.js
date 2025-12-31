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
        return { success: true, data: response.data };
    } catch (error) {
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
        return null;
    }
}

async function getProduct() {
    try {
        const response = await apiClient.get('/product');
        return response.data;
    } catch (error) {
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
        const fechaHoy = new Date()
        /* fechaHoy.setHours(fechaHoy.getHours() - 3) */

        const dateProduct = await getDateProduct()

        if (productInStorageParsed?.product?.length > 0) {
            // Sumar 3 horas a la fecha de lastUpdate
            const lastUpdate = new Date(productInStorageParsed?.lastUpdate);
            const lastUpdateBd = new Date(dateProduct?.ultimaUpdatedAt)
            const lastCreateBd = new Date(dateProduct?.ultimaCreatedAt)

            lastUpdate.setHours(fechaHoy.getHours() - 3)
            /* lastCreateBd.setHours(fechaHoy.getHours() + 3) */

            if (lastUpdate < lastUpdateBd || lastUpdate < lastCreateBd) {
                const listProduct = await getProduct()

                const productStorage = {
                    product: listProduct,
                    lastUpdate: fechaHoy
                }
                await AsyncStorage.setItem('productStorage', JSON.stringify(productStorage))

                return
            } else {
                return
            }
        }

        const listProduct = await getProduct()

        const productStorage = {
            product: listProduct,
            lastUpdate: new Date().toISOString()
        }
        await AsyncStorage.setItem('productStorage', JSON.stringify(productStorage))
        return
    } else {
        console.log('syncProduct: Ping falló, no se puede sincronizar productos');
    }

}


// Definir tarea en segundo plano para el ping
TaskManager.defineTask(PING_TASK, async () => {
    try {
        await sendPingNotification();
        return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (err) {
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
});

TaskManager.defineTask(SYNCPRODUCT_TASK, async () => {
    try {
        await syncProduct();
        return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (err) {
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
                minimumInterval: 60 * 5,
                /* minimumInterval: 30, */
                stopOnTerminate: false,
                startOnBoot: true,
            });
        }
    } catch (error) {
    }
}

export async function registerBackgroundSyncProductTask() {
    try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(SYNCPRODUCT_TASK);

        if (!isRegistered) {
            await BackgroundFetch.registerTaskAsync(SYNCPRODUCT_TASK, {
                minimumInterval: 60 * 5,
                /* minimumInterval: 30, */
                stopOnTerminate: false,
                startOnBoot: true,
            });
        }
    } catch (error) {
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
    }, 300000); // 10 minutos (600000 ms)
}

export function startSyncProductChecks() {

    if (syncProductInterval) {
        clearInterval(syncProductInterval);
    }

    syncProductInterval = setInterval(async () => {
        if (AppState.currentState === 'active') {
            await syncProduct();
        }
    }, 300000); // 1 minuto (60000 ms)
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