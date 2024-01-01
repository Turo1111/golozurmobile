import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const useLocalStorage = (initialValue, key) => {
  const [data, setData] = useState(initialValue);

  const saveData = async (value) => {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
      setData(value);
    } catch (e) {
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
    }
  };

  const clearData = async () => {
    try {
      await AsyncStorage.removeItem(key)
      setData(initialValue)
    } catch (e) {
    }
  };

  useEffect(() => {
    getData();
  }, []);

  return { data, saveData, clearData, getData };
};

export default useLocalStorage;