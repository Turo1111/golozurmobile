import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { LogBox } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import App Navigation
import NavigationStack from './src/navigation/NavigationStack';
import Loading from './src/components/Loading';
import Alert from './src/components/Alert';
import ThermalReceiptRenderer from './src/components/ThermalReceiptRenderer';

// Import Store
import { store } from './src/redux/store';

// Import Context
import { OfflineProvider } from './src/context.js/contextOffline';

// Import notification service
import { initNotificationSystem } from './src/services/NotificationService.js';

// Ignore all log notifications:
LogBox.ignoreAllLogs();

// Controlamos el splash manualmente para que no quede tapando la app si las fuentes fallan.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [loaded, fontError] = useFonts({
    'Cairo-Regular': require('./assets/fonts/Cairo-Regular.ttf'),
    'Cairo-Bold': require('./assets/fonts/Cairo-Bold.ttf'),
    'Cairo-Light': require('./assets/fonts/Cairo-Light.ttf'),
  });
  const [fontTimeout, setFontTimeout] = useState(false);
  const ready = loaded || !!fontError || fontTimeout;

  useEffect(() => {
    // Si las fuentes no resuelven, no dejamos la app trabada en el splash.
    const timer = setTimeout(() => setFontTimeout(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  useEffect(() => {
    if (fontError) {
      console.warn('No se pudieron cargar las fuentes Cairo; se usan las del sistema.', fontError);
    }
  }, [fontError]);

  useEffect(() => {
    // Inicializar sistema de notificaciones de estado de conexión
    initNotificationSystem().then(success => {
      if (success) {
        console.log('Sistema de notificaciones de conexión inicializado');
      } else {
        console.log('No se pudieron inicializar las notificaciones');
      }
    });
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style='light' />
      <Provider store={store}>
        <OfflineProvider>
          <NavigationContainer>
            <NavigationStack />
            <Loading />
            <Alert />
            <ThermalReceiptRenderer />
          </NavigationContainer>
        </OfflineProvider>
      </Provider>
    </SafeAreaProvider>
  );
}
