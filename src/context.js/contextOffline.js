import { createContext, useEffect, useState } from "react";
import apiClient from "../utils/client";
import useLocalStorage from "../hooks/useLocalStorage";
import { useAppDispatch, useAppSelector } from "../redux/hook";
import { clearLoading, setLoading } from "../redux/loadingSlice";
import { getUser } from "../redux/userSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAlert } from "../redux/alertSlice";

export const OfflineContext = createContext();

export const OfflineProvider = ({ children }) => {

  const dispatch = useAppDispatch();
  const user = useAppSelector(getUser)
  const { data: userStorage } = useLocalStorage([], 'user')
  const [sales, setSales] = useState([]);
  const [offline, setOffline] = useState(true)

  const saveDataStorage = async (value, key) => {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (e) {
    }
  };

  const getDataStorage = async (key) => {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue ? JSON.parse(jsonValue) : [];
    } catch (error) {
      console.error('Error getting data from storage:', error);
      return [];
    }
  };

  const clearDataStorage = async (key) => {
    try {
      await AsyncStorage.removeItem(key)
    } catch (e) {
    }
  };

  const setModeOffline = async () => {
    const newOfflineState = !offline;
    setOffline(newOfflineState); // Cambio el estado de la conexión a offline
    await AsyncStorage.setItem('offlineStorage', JSON.stringify(newOfflineState));

    const saleStorage = await getDataStorage('saleStorage')

    if (newOfflineState) {
      return;
    }

    if (sales.length > 0 || saleStorage.length > 0) {
      let newSales = [];
      if (sales.length > 0) {
        newSales = sales
      } else {
        newSales = saleStorage
      }
      dispatch(setLoading({
        message: `Guardando ventas`
      }))
      apiClient.post('/sale/multiple', newSales, {
        headers: {
          Authorization: `Bearer ${user.token || userStorage.token}`
        }
      })
        .then((r) => {
          clearDataStorage('saleStorage')
          setSales([])
          dispatch(clearLoading())
        })
        .catch((e) => { console.log('error post sale multiple', e); dispatch(clearLoading()) })
    }
  }

  const createSale = async (saleData) => {
    try {
      const updatedSales = [...sales, saleData];
      saveDataStorage(updatedSales, 'saleStorage')
      setSales(updatedSales);
    } catch (e) {
      console.error('Error creating sale:', e);
      throw e;
    }
  };

  useEffect(() => {
    console.log("offline useEffect", offline)
    const getProduct = async () => {
      dispatch(setLoading({
        message: `Actualizando productos`
      }))
      apiClient.get('/product')
        .then(r => {
          saveDataStorage(r.data, 'productStorage')
          dispatch(clearLoading())
        })
        .catch(e => {
          console.log('error get product', e); dispatch(clearLoading())
          dispatch(setAlert({
            message: `${e.response?.data || 'Ocurrio un error'}`,
            type: 'error'
          }))
        })
    }

    if (offline) {
      getProduct()
    }
  }, [offline])

  useEffect(() => {
    const checkSalesStorage = async () => {
      const saleStorageData = await AsyncStorage.getItem('saleStorage');
      if (saleStorageData && sales.length === 0) {
        const parsedSales = JSON.parse(saleStorageData);
        setSales(parsedSales);
      }
    };

    checkSalesStorage();

    return () => {
    }
  }, []);

  // Este useEffect solo carga el valor inicial desde el storage al inicio
  useEffect(() => {
    const initializeOfflineState = async () => {
      try {
        // Solo leemos y configuramos el valor inicial una vez
        const storedValue = await AsyncStorage.getItem('offlineStorage');

        console.log("offline", offline)
        console.log("offline storage", storedValue)
        if (storedValue !== offline) {
          console.log("Son distintos")
          setOffline(storedValue);
        }
      } catch (e) {
        console.error('Error al inicializar el modo offline:', e);
        dispatch(setAlert({
          message: 'Ocurrió un error al inicializar el modo offline, por favor reinicie la aplicación',
          type: 'error'
        }));
      }
    };

    initializeOfflineState();
  }, []);

  const isOffline = () => offline

  const valueContext = {
    setModeOffline,
    createSale,
    sales,
    offline,
    isOffline
  };

  return (
    <OfflineContext.Provider value={valueContext}>
      {children}
    </OfflineContext.Provider>
  );
};
