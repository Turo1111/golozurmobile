import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import axios from 'axios';

// Define la tarea en segundo plano
TaskManager.defineTask('PRODUCT_FETCH_TASK', async () => {
  try {
    const now = Date.now();

    axios.get('http://10.0.2.2:5000/product/active')
    .then(async(r)=>{})
    .catch(async(e)=>{})

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Error en la tarea de fondo:', error);

    // Envía notificación de error
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Error al actualizar bd',
        body: `Error al ejecutar la tarea: ${error.message}`,
      },
      trigger: null, // Inmediatamente
    });

    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Registro de la tarea en segundo plano
export const registerBackgroundFetch = async () => {
  try {
    await BackgroundFetch.registerTaskAsync('PRODUCT_FETCH_TASK', {
      minimumInterval: 1800, // Intervalo en segundos para pruebas
      stopOnTerminate: true, // Mantener la tarea después de cerrar la app
      startOnBoot: true, // Iniciar en el arranque del dispositivo
    });
  } catch (err) {
  }
};
