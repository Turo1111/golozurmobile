import { createContext, useEffect, useState } from "react";
import apiClient from "../utils/client";
import useLocalStorage from "../hooks/useLocalStorage";
import { useAppDispatch, useAppSelector } from "../redux/hook";
import { clearLoading, setLoading } from "../redux/loadingSlice";
import { getUser } from "../redux/userSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const OfflineContext = createContext();

export const OfflineProvider = ({ children }) => {
  const [offline, setOffline] = useState(true);
  const {data: productStorage, saveData: setProductStorage} = useLocalStorage([],'productStorage')
  const dispatch = useAppDispatch();
  const {data: saleStorage, clearData: clearDataSaleStorage} = useLocalStorage([],'saleStorage')
  const user = useAppSelector(getUser) 
  const {data: userStorage} = useLocalStorage([],'user')
  const [isSaleStorage, setIsSaleStorage] = useState(false)
  const {data: offlineStorage, saveData: setOfflineStorage} = useLocalStorage(true,'offlineStorage')

  const setModeOffline = async () => {
    setOffline(prevData=>!offline)
    setOfflineStorage(!offlineStorage)
    if (!offline) {
      const saleStorage = await AsyncStorage.getItem('saleStorage');
      let parsedSaleStorage = [];
      if (saleStorage) {
        parsedSaleStorage = JSON.parse(saleStorage);
        dispatch(setLoading({
          message: `Guardando ventas`
        }))
        apiClient.post('/sale/multiple', parsedSaleStorage,{
          headers: {
            Authorization: `Bearer ${user.token || userStorage.token}` 
          }
        })
        .then((r)=>{
          setIsSaleStorage(false)
          clearDataSaleStorage()
          dispatch(clearLoading())
        })
        .catch((e)=>{console.log(e);dispatch(clearLoading())})
      } 
      return  
    }
    const now = Date.now();
    dispatch(setLoading({
      message: `Actualizando productos`
    }))
    apiClient.get('/product')
    .then(r=>{
      setProductStorage(r.data)
      console.log('actualizando productos')
      dispatch(clearLoading())
    })
    .catch(e=>{console.log(e);dispatch(clearLoading())})
  }

  useEffect(() => {
    if (offline !== offlineStorage) {
      setOffline(offlineStorage)
    }
  }, [offlineStorage])
  

  const valueContext = {
    offline,
    setModeOffline,
    isSaleStorage,
    trueSaleStorage: () => setIsSaleStorage(true)
  };

  return (
    <OfflineContext.Provider value={valueContext}>
      {children}
    </OfflineContext.Provider>
  );
};
