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
import { setAlert } from '../redux/alertSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';

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
    const [dataSearch, setDataSearch] = useState([])
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
      console.log(input)
      try {
          const response = await apiClient.post(`/sale/search`, {input});
          setDataSearch(response.data);
      } catch (e) {
          console.log("error sale search", e);
      } finally {
        dispatch(clearLoading())
      }
    }

    useEffect(() => {
      let timeoutId;
  
      if (search.value !== '') {
        timeoutId = setTimeout(() => {
          getSaleSearch(search.value);
          console.log('buscar', search.value);
        }, 1000);
      }
  
      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }, [search.value]); 

    useEffect(()=>{
      if (user && !offlineStorage) {
        getSale(query.skip, query.limit)
      }
    },[query, offlineStorage])

    useEffect(()=>{
      const socket = io('https://gzapi.vercel.app')
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

const generatePdf = async (cliente) => {
  let details = undefined
  if (offlineStorage) {
    try {
      const jsonValue = await AsyncStorage.getItem('saleStorage');
      if (jsonValue !== null) {
        const value = JSON.parse(jsonValue);
        details = await value.find(elem=>elem.cliente === cliente)
      }
    } catch (e) {
      dispatch(setAlert({
        message: 'Hubo un error al obtener la venta 1',
        type: 'error'
      }))
    }
  }else{
    await apiClient.get(`/sale/${cliente}`,
      {
          headers: {
            Authorization: `Bearer ${user.token || userStorage.token}` // Agregar el token en el encabezado como "Bearer {token}"
          },
    })
    .then(r=>{
      console.log(r.data)
      details = {itemsSale: r.data.itemsSale, cliente: r.data.r.cliente, total: r.data.r.total, createdAt: r.data.r.createdAt}
    })
    .catch(e=> {
      dispatch(setAlert({
        message: 'Hubo un error al obtener la venta 1',
        type: 'error'
      }))
    })
  }

  console.log(details)

  if (!details) {
    dispatch(setAlert({
      message: 'Hubo un error al obtener la venta 2',
      type: 'error'
    }))
    return 
  }

    const itemsText = details.itemsSale.map(item => `
      <div class="it">
        <p class="it">${(item.descripcion).toUpperCase()}</p>
        <div class="itemList">
          <div class="flex" >
            <p class="it">${item.cantidad}x</p>
            <p class="it">$${(item.precio || item.precioUnitario).toString().toLocaleString('es-ES')}</p>
          </div>
          <p class="it">$${(item.total).toString().toLocaleString('es-ES')}</p>
        </div>
      </div>
    `).join('');
  
    const htmlContent = `
      <html>
        <head>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 15px;
              margin: 0;
              padding: 0;
            }
            .header {
              margin-left: 5px;
              padding: 0;
            }
            .header h2 {
              text-align: center;
              padding: 0;
              margin-bottom: 5px;
              font-size: 15px;
            }
            .header p {
              padding: 0;
              margin: 0;
              margin-bottom: 2px;
              font-size: 15px;
            }
            .details {
              margin: 0;
              font-size: 15px;
              padding: 0;
            }
            .flex {
              display: flex;
              margin: 0;
              padding: 0;
            }
            .itemList{
              display: flex;
              padding: 0px 3px;
              margin: 0;
              padding: 0;
              justify-content: space-between;
            }
            .it{
              margin: 0;
              padding: 0;
            }
            .total {
              margin: 0;
              font-weight: bold;
              text-align: right;
              font-size: 18px;
              padding: 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>GOLOZUR</h2>
            <p>Fecha: ${details.createdAt.split("T")[0]}</p>
            <p>Cliente: ${details.cliente}</p>
            <p>*NO VALIDO COMO FACTURA</p>
          </div>
          <hr/>
          <div class="details">
            ${itemsText}
          </div>
          <hr/>
          <div class="total">
            <p>Total Neto $ ${(details.total).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </body>
      </html>
    `;
  
    try {
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        width: 200,  // 57 mm en puntos
        height: 192.85
      });
  
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri);
      } else {
        console.log('Compartir no disponible en este dispositivo');
      }
    } catch (error) {
      console.error('Error generando el PDF:', error);
    }
  };

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
            data={search.value !== '' ? dataSearch : data}
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
                      <View style={{flexDirection: 'row', flex: 1}} >
                        <Pressable style={{borderColor: '#d9d9d9', borderWidth: 1, padding: 8, marginVertical: 10, flexDirection: 'column', alignItems: 'center', flex: 1}} 
                          onPress={()=>downloadAndSharePDF(item)}
                        >
                          <FeatherIcons name='printer' size={20} color='#252525' style={{textAlign: 'center'}} />
                          <Text style={{fontSize: 14, color: '#252525',fontWeight: 500}}>Generar pdf</Text>
                        </Pressable>
                        <Pressable style={{borderColor: '#d9d9d9', borderWidth: 1, padding: 8, marginVertical: 10, flexDirection: 'column', alignItems: 'center', flex: 1}} 
                          onPress={()=>generatePdf(item._id)}
                        >
                          <FeatherIcons name='printer' size={20} color='#252525' style={{textAlign: 'center'}} />
                          <Text style={{fontSize: 14, color: '#252525',fontWeight: 500}}>Generar ticket</Text>
                        </Pressable>
                      </View>
                  </Pressable>
              )
            }}
            keyExtractor={(item) => item._id}
            onEndReached={()=>{
              console.log('estoy en el final')
              if(!loading.open){
                if(search){
                  if(search.value === '' ){
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
            renderItem={({ item, index }) =>{
              return (
                  <Pressable style={styles.item} key={index} onPress={()=>{
                      
                  }}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center'}}>
                      <View style={{width:'80%'}}>
                        <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', flex: 1}}>
                            <Text style={{fontSize: 18, color: '#252525'}}>{item.cliente}</Text>
                            <Text style={{fontSize: 18, fontWeight: 600, color: '#FA9B50'}}>$ {item.total}</Text>
                        </View>
                        <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'end', flex: 1}}>
                            <Text style={{fontSize: 14, color: '#252525',fontWeight: 500}}>{item.itemsSale.length} productos</Text>
                        </View>
                      </View>
                      <Pressable onPress={()=>generatePdf(item.cliente)} style={{flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginLeft: 15, width:'20%', backgroundColor: '#608BC1', paddingVertical: 10}}>
                        <FeatherIcons name='printer' size={20} color='#fff' style={{textAlign: 'center'}} />
                      </Pressable>
                    </View>
                  </Pressable>
              )
            }}
            keyExtractor={(item) => item._id}
            ListEmptyComponent={<Text style={{fontSize: 18, fontFamily: 'Cairo-Regular', paddingHorizontal: 15, textAlign: 'center', marginTop: '15%' }} >SIN VENTAS EN MODO OFFLINE</Text>}
            onEndReached={()=>{
              /* if(!loading.open){
                if(search){
                  if(search.value === ''){
                    dispatch(setLoading({
                        message: `Cargando nuevas ventas`
                    }))
                    setQuery({skip: query.skip+15, limit: query.limit})
                  }
                }
              } */
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
    },
})