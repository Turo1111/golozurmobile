import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

// Objeto para almacenar las funciones de callback que escuchan cambios
const listeners = {};

// Función para emitir un evento de cambio a todos los oyentes de una clave específica
const notifyListeners = (key, data) => {
  if (listeners[key]) {
    listeners[key].forEach(callback => {
      callback(data);
    });
  }
};

// Función para suscribirse a los cambios en una clave específica
export const subscribeToStorage = (key, callback) => {
  if (!listeners[key]) {
    listeners[key] = [];
  }
  listeners[key].push(callback);

  // Devolver función para cancelar la suscripción
  return () => {
    if (listeners[key]) {
      const index = listeners[key].indexOf(callback);
      if (index !== -1) {
        listeners[key].splice(index, 1);
      }
    }
  };
};

// Función para leer datos del storage directamente (útil fuera de componentes React)
export const readStorage = async (key, defaultValue = null) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : defaultValue;
  } catch (error) {
    console.error('Error reading storage:', error);
    return defaultValue;
  }
};

const useLocalStorage = (initialValue, key) => {
  const [data, setData] = useState(initialValue);

  const saveData = async (value) => {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
      setData(value);
      // Notificar a otros componentes sobre el cambio
      notifyListeners(key, value);
    } catch (e) {
      console.error('Error saving data:', e);
    }
  };

  const getData = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      if (jsonValue !== null) {
        const value = JSON.parse(jsonValue);
        setData(value);
      }
    } catch (e) {
      console.error('Error getting data:', e);
    }
  };

  const clearData = async () => {
    try {
      await AsyncStorage.removeItem(key);
      setData(initialValue);
      // Notificar a otros componentes sobre el cambio
      notifyListeners(key, initialValue);
    } catch (e) {
      console.error('Error clearing data:', e);
    }
  };

  useEffect(() => {
    getData();

    // Suscribirse a los cambios para este storage key
    const unsubscribe = subscribeToStorage(key, (newData) => {
      setData(newData);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { data, saveData, clearData, getData };
};

export default useLocalStorage;