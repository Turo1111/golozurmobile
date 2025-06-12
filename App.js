import { NavigationContainer } from '@react-navigation/native';
import NavigationStack from './src/navigation/NavigationStack';
import { useFonts } from '@expo-google-fonts/inter';
import { Provider } from 'react-redux';
import { store } from './src/redux/store';
import Alert from './src/components/Alert';
import Loading from './src/components/Loading';
import { OfflineProvider } from './src/context.js/contextOffline';
import { useEffect, useState } from 'react';
import { registerBackgroundFetch } from './src/services/setupBackgroundFetch';
import { View, Text } from 'react-native'; // Esto es para mostrar un placeholder mientras las fuentes cargan
import * as Notifications from 'expo-notifications';

export default function App() {
  // Cargar las fuentes
  let [fontsLoaded] = useFonts({
    'Cairo-Regular': require('./assets/fonts/Cairo-Regular.ttf'),
    'Cairo-Light': require('./assets/fonts/Cairo-Light.ttf'),
    'Cairo-Bold': require('./assets/fonts/Cairo-Bold.ttf'),
  });

  useEffect(() => {
    registerBackgroundFetch();

    const askNotificationPermission = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permisos para notificaciones no concedidos');
      }
    };

    askNotificationPermission();
  }, []);


  // Mientras se cargan las fuentes, muestra algo como un texto de carga o un indicador de actividad
  if (!fontsLoaded) {
    return (
      <View>
        <Text>Cargando fuentes...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Provider store={store}>
        <OfflineProvider>
          <NavigationStack />
          <Alert />
          <Loading />
        </OfflineProvider>
      </Provider>
    </NavigationContainer>
  );
}
