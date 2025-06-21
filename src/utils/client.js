import axios from "axios";
import { store } from '../redux/store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const apiClient = axios.create({
  baseURL: 'http://10.0.2.2:5000',
  timeout: 7000
});

// Function to get token from Redux or AsyncStorage
const getToken = async () => {
  try {
    // Get token from Redux state
    const state = store.getState();
    const reduxToken = state.user.token;

    if (reduxToken) {
      return reduxToken;
    }

    // Fallback to AsyncStorage if no token in Redux
    const userStr = await AsyncStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.token;
    }
    return null;
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

// Add request interceptor to add token to all requests
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;