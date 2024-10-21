import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { getUser } from '../redux/userSlice';
import { clearLoading, getLoading, setLoading } from '../redux/loadingSlice';
import { useAppDispatch, useAppSelector } from '../redux/hook';
import apiClient from '../utils/client';
import Search from '../components/Search';
import Button from '../components/Button';
import { useInputValue } from '../hooks/useInputValue';
import { io } from 'socket.io-client';
import useInternetStatus from '../hooks/useInternetStatus';
import { OfflineContext } from '../context.js/contextOffline';
import useLocalStorage from '../hooks/useLocalStorage';
import FeatherIcons from 'react-native-vector-icons/Feather'
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Buffer } from 'buffer';

const arrayBufferToBase64 = (buffer) => {
  return Buffer.from(buffer).toString('base64');
};

export default function Sale({navigation}) {

    const user = useAppSelector(getUser) 
    const {data: userStorage} = useLocalStorage([],'user')
    const loading = useAppSelector(getLoading)
    const dispatch = useAppDispatch();
    const [data, setData] = useState([])
    const search = useInputValue('','')
    const {data: saleStorage, clearData: clearDataSaleStorage} = useLocalStorage([],'saleStorage')
    const {data: offlineStorage, saveData: setOfflineStorage} = useLocalStorage(true,'offlineStorage')

    const [query, setQuery] = useState({skip: 0, limit: 25})

    const {offline} = useContext(OfflineContext)

    const getSale = async (skip, limit) => {
      dispatch(setLoading({
        message: `Actualizando ventas`
      }))
      try {
        const response = await apiClient.post(`/sale/skip`, { skip, limit },
          {
              headers: {
                  Authorization: `Bearer ${user.token || userStorage.token}`
              },
          });
          setData((prevData)=>{
            if (prevData) {
              if (prevData.length === 0) {
                  return response.data.array
              }
              const newData = response.data.array.filter((element) => {
                return prevData.findIndex((item) => item._id === element._id) === -1;
              });
              /* console.log([...prevData, ...newData]); */
              return [...prevData, ...newData];
            }
            return []
          })
      } catch (e) {
        console.log("error getSale",e)
      } finally {
        dispatch(clearLoading());
      }
    }

    const getSaleSearch = async (input) => {
      dispatch(setLoading({
        message: `Actualizando ventas`
      }))
      try {
          const response = await apiClient.post(`/sale/search`, {input});
          setDataSearch(response.data);
      } catch (e) {
          console.log("error sale search", e);
      } finally {
        dispatch(clearLoading())
      }
    }

    useEffect(()=>{
      if ( search.value !== '') {
        getSaleSearch(search)
      }
    },[search]) 

    useEffect(()=>{
      if (user) {
        getSale(query.skip, query.limit)
      }
    },[query])

    useEffect(()=>{
      const socket = io('https://apigolozur.onrender.com')
      socket.on(`sale`, (socket) => {
        console.log('escucho', socket)
        setData((prevData)=>{
          return [ socket.data, ...prevData]
        })
      })
      return () => {
        socket.disconnect();
      }; 
    },[data])

    const downloadAndSharePDF = async (item) => {
      const fileName = `venta-${item.cliente}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      dispatch(setLoading({
        message: `Actualizando ventas`
      }))
      try {
        // Descargar el archivo como ArrayBuffer
        const response = await apiClient.get(`/sale/print/${item._id}`, { responseType: 'arraybuffer' });
        const pdfArrayBuffer = response.data;
  
        // Convertir el ArrayBuffer a Base64 usando Buffer
        const pdfBase64 = arrayBufferToBase64(pdfArrayBuffer);
  
        // Guardar el archivo en el sistema de archivos de Expo
        await FileSystem.writeAsStringAsync(fileUri, pdfBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });
  
        // Compartir el archivo utilizando expo-sharing
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Compartir PDF',
            UTI: 'com.adobe.pdf',
          });
        } else {
          alert('La función de compartir no está disponible en este dispositivo');
        }
        dispatch(clearLoading())
      } catch (error) {
        console.error('Error descargando o compartiendo el PDF:', error);
        dispatch(clearLoading())
      }
    };

    useEffect(()=>{console.log("saleStorage",saleStorage)},[saleStorage])

  return (
    <View>
      {
        !offlineStorage ?
        <View>

          <Search placeholder={'Buscar ventas'} searchInput={search} />
          <View style={{paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', margin: 15}} >
            <Button text={'Nuevo'} fontSize={14} width={'45%'} onPress={()=>{navigation.navigate('NewSale')}} />
          </View>
          <Text style={{fontSize: 18, fontFamily: 'Cairo-Regular', color: '#799351', paddingHorizontal: 15 }} >Estas en modo con conexion</Text>
          <FlatList 
            style={{height: '83%'}}
            data={data}
            renderItem={({ item }) =>{
              return (
                  <Pressable style={styles.item} onPress={()=>{
                      navigation.navigate('DetailsSale', {
                        id: item._id,
                        name: item.cliente,
                      })
                  }}>
                      <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', flex: 1}}>
                          <Text style={{fontSize: 18, color: '#252525'}}>{item.cliente}</Text>
                          <Text style={{fontSize: 18, fontWeight: 600, color: '#FA9B50'}}>$ {item.total}</Text>
                      </View>
                      <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'end', flex: 1}}>
                          <Text style={{fontSize: 14, color: '#252525',fontWeight: 500}}>{item.createdAt.split("T")[0]}</Text>
                      </View>
                      <Pressable style={{borderColor: '#d9d9d9', borderWidth: 1, padding: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 10}} 
                        onPress={()=>downloadAndSharePDF(item)}
                      >
                        <FeatherIcons name='printer' size={20} color='#252525' style={{textAlign: 'center'}} />
                      </Pressable>
                  </Pressable>
              )
            }}
            keyExtractor={(item) => item._id}
            onEndReached={()=>{
              console.log('estoy en el final')
              if(!loading.open){
                if(search){
                  if(search.value === ''){
                    dispatch(setLoading({
                        message: `Cargando nuevas ventas`
                    }))
                    setQuery({skip: query.skip+15, limit: query.limit})
                  }
                }
              }
            }}
          />
        </View>:
        <View>
          <View style={{paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', margin: 15}} >
            <Button text={'Nuevo'} fontSize={14} width={'45%'} onPress={()=>{navigation.navigate('NewSale')}} />
          </View>
          <Text style={{fontSize: 18, fontFamily: 'Cairo-Regular', color: '#C7253E', paddingHorizontal: 15 }} >Estas en modo sin conexion</Text>
          <FlatList 
            style={{height: '83%'}}
            data={saleStorage}
            renderItem={({ item }) =>{
              return (
                  <Pressable style={styles.item} onPress={()=>{
                      
                  }}>
                      <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', flex: 1}}>
                          <Text style={{fontSize: 18, color: '#252525'}}>{item.cliente}</Text>
                          <Text style={{fontSize: 18, fontWeight: 600, color: '#FA9B50'}}>$ {item.total}</Text>
                      </View>
                      <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'end', flex: 1}}>
                          <Text style={{fontSize: 14, color: '#252525',fontWeight: 500}}>{item.itemsSale.length} productos</Text>
                      </View>
                  </Pressable>
              )
            }}
            keyExtractor={(item) => item._id}
            ListEmptyComponent={<Text style={{fontSize: 18, fontFamily: 'Cairo-Regular', paddingHorizontal: 15, textAlign: 'center', marginTop: '15%' }} >SIN VENTAS EN MODO OFFLINE</Text>}
            onEndReached={()=>{
              if(!loading.open){
                if(search){
                  if(search.value === ''){
                    dispatch(setLoading({
                        message: `Cargando nuevas ventas`
                    }))
                    setQuery({skip: query.skip+15, limit: query.limit})
                  }
                }
              }
            }}
          />
        </View>
      }
    </View>
  )
}

const styles = StyleSheet.create({
    item: {
        padding: 10,
        borderBottomWidth: 1,
        borderColor: '#ddd',
        justifyContent: 'space-between'
    },
})