import { createContext, useEffect, useState } from "react";
import apiClient from "../utils/client";
import useLocalStorage from "../hooks/useLocalStorage";
import { useAppDispatch, useAppSelector } from "../redux/hook";
import { clearLoading, setLoading } from "../redux/loadingSlice";
import { getUser } from "../redux/userSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const OfflineContext = createContext();

export const OfflineProvider = ({ children }) => {

  const dispatch = useAppDispatch();
  const user = useAppSelector(getUser)
  const { data: userStorage } = useLocalStorage([], 'user')
  const [sales, setSales] = useState([]);
  const [offline, setOffline] = useState(false)

  //const { data: saleStorage, clearData: clearDataSaleStorage, saveData: setSaleStorage } = useLocalStorage([], 'saleStorage')
  //const { data: offlineStorage, saveData: setOfflineStorage } = useLocalStorage(true, 'offlineStorage')
  //const { data: productStorage, saveData: setProductStorage } = useLocalStorage([], 'productStorage')

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
    setOffline(!offline) //Cambio el estado de la conexion a offline

    const saleStorage = await getDataStorage('saleStorage')

    if (!offline) {
      return
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
          dispatch(clearLoading())
        })
        .catch((e) => { console.log('error post sale multiple', e); dispatch(clearLoading()) })
    }

  }

  const createSale = async (saleData) => {
    try {
      console.log('saleData', saleData)
      const updatedSales = [...sales, saleData];
      saveDataStorage(updatedSales, 'saleStorage')
      //await setSaleStorage(updatedSales)
      setSales(updatedSales);
    } catch (e) {
      console.error('Error creating sale:', e);
      throw e;
    }
  };

  useEffect(() => {

    const getProduct = async () => {
      dispatch(setLoading({
        message: `Actualizando productos`
      }))
      apiClient.get('/product')
        .then(r => {
          saveDataStorage(r.data, 'productStorage')
          dispatch(clearLoading())
        })
        .catch(e => { console.log('error get product', e); dispatch(clearLoading()) })
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

  const valueContext = {
    setModeOffline,
    createSale,
    sales,
    offline,
  };

  return (
    <OfflineContext.Provider value={valueContext}>
      {children}
    </OfflineContext.Provider>
  );
};
