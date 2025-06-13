import React, { useState, useRef, useContext, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { OfflineContext } from '../context.js/contextOffline';
import useLocalStorage from '../hooks/useLocalStorage';
import apiClient from '../utils/client';
import { useAppDispatch, useAppSelector } from '../redux/hook';
import { getUser } from '../redux/userSlice';
import { clearLoading, setLoading } from '../redux/loadingSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ToggleButton = () => {
  const animation = useRef(new Animated.Value(2)).current;  // Valor inicial de 'left'

  const dispatch = useAppDispatch();
  const user = useAppSelector(getUser)
  const { data: userStorage } = useLocalStorage([], 'user')
  const { offline, setModeOffline } = useContext(OfflineContext)

  //const [isSaleStorage, setIsSaleStorage] = useState(false)
  //const { data: offlineStorage, saveData: setOfflineStorage } = useLocalStorage(true, 'offlineStorage')
  //const { data: saleStorage, clearData: clearDataSaleStorage } = useLocalStorage([], 'saleStorage')
  //const { data: productStorage, saveData: setProductStorage } = useLocalStorage([], 'productStorage')

  const toggleCheck = async () => {

    //setOfflineStorage(!offlineStorage)
    Animated.timing(animation, {
      toValue: offline ? 2 : 58,  // Cambia el valor de 'left'
      duration: 300,
      useNativeDriver: false,
    }).start();

    await setModeOffline()

    /* if (offlineStorage) {
      const saleStorage = await AsyncStorage.getItem('saleStorage');
      let parsedSaleStorage = [];
      if (saleStorage) {
        parsedSaleStorage = JSON.parse(saleStorage);
        dispatch(setLoading({
          message: `Guardando ventas`
        }))
        apiClient.post('/sale/multiple', parsedSaleStorage, {
          headers: {
            Authorization: `Bearer ${user.token || userStorage.token}`
          }
        })
          .then((r) => {
            setIsSaleStorage(false)
            clearDataSaleStorage()
            dispatch(clearLoading())
          })
          .catch((e) => { console.log(e); dispatch(clearLoading()) })
      }
      return
    }
    const now = Date.now();
    dispatch(setLoading({
      message: `Actualizando productos`
    }))
    apiClient.get('/product')
      .then(r => {
        setProductStorage(r.data)
        dispatch(clearLoading())
      })
      .catch(e => { console.log(e); dispatch(clearLoading()) }) */
  };

  useEffect(() => {
    if (offline) {
      Animated.timing(animation, {
        toValue: 58,  // Cambia el valor de 'left'
        duration: 300,
        useNativeDriver: false,
      }).start();
      return
    }
    Animated.timing(animation, {
      toValue: 2,  // Cambia el valor de 'left'
      duration: 300,
      useNativeDriver: false,
    }).start();
    return
  }, [offline])

  return (
    <View style={styles.toggleButtonCover}>
      <TouchableOpacity style={[styles.button, { backgroundColor: `${offline ? '#FF6868' : '#A1DD70'}` }]} onPress={toggleCheck}>
        <Animated.View style={[styles.knobs, { left: animation, backgroundColor: `${offline ? '#FF6868' : '#A1DD70'}` }]}>
          <Text style={styles.knobText}>
            {offline ? 'SIN CONEXION' : 'CON CONEXION'} {/* verdadero cuando esta sin conexion y falso con conexion */}
          </Text>
        </Animated.View>
        <View style={[styles.layer, offline && styles.layerChecked]} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  toggleButtonCover: {
    width: 180,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  button: {
    position: 'relative',
    width: 180,
    height: 36,
    borderRadius: 100,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  knobs: {
    position: 'absolute',
    top: 2,
    width: 120,
    height: 36,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  knobText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ebf7fc',
    zIndex: 1,
  },
  layerChecked: {
    backgroundColor: '#fcebeb',
  },
});

export default ToggleButton;
