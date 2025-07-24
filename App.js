import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { LogBox } from 'react-native';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import App Navigation
import NavigationStack from './src/navigation/NavigationStack';
import Loading from './src/components/Loading';
import Alert from './src/components/Alert';

// Import Store
import { store } from './src/redux/store';

// Import Context
import { OfflineProvider } from './src/context.js/contextOffline';

// Import notification service
import { initNotificationSystem } from './src/services/NotificationService.js';

// Ignore all log notifications:
LogBox.ignoreAllLogs();

export default function App() {
  const [loaded] = useFonts({
    'Cairo-Regular': require('./assets/fonts/Cairo-Regular.ttf'),
    'Cairo-Bold': require('./assets/fonts/Cairo-Bold.ttf'),
    'Cairo-Light': require('./assets/fonts/Cairo-Light.ttf'),
  });

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

  if (!loaded) {
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
          </NavigationContainer>
        </OfflineProvider>
      </Provider>
    </SafeAreaProvider>
  );
}
