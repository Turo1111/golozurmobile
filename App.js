import { NavigationContainer } from '@react-navigation/native';
import NavigationStack from './src/navigation/NavigationStack';
import { useFonts } from '@expo-google-fonts/inter';
import { Provider } from 'react-redux';
import { store } from './src/redux/store';
import Alert from './src/components/Alert';
import Loading from './src/components/Loading';

export default function App() {

  let [fontsLoaded] = useFonts({
    'Cairo-Regular': require('./assets/fonts/Cairo-Regular.ttf'),
    'Cairo-Light': require('./assets/fonts/Cairo-Light.ttf'),
    'Cairo-Bold': require('./assets/fonts/Cairo-Bold.ttf'),
  })

  if (!fontsLoaded) {
    return null;
  }

  return (
    <NavigationContainer>
      <Provider store={store} >
        <NavigationStack>
        </NavigationStack>
        <Alert/>
        <Loading/>
      </Provider>
    </NavigationContainer>
  );
}

