import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import apiClient from '../utils/client'
import { getUser } from '../redux/userSlice';
import { useAppDispatch, useAppSelector } from '../redux/hook';
import { clearLoading, getLoading, setLoading } from '../redux/loadingSlice';
import Search from '../components/Search';
import Button from '../components/Button';
import {useInputValue} from '../hooks/useInputValue'
import { io } from 'socket.io-client';
import UpdatePrice from '../components/UpdatePrice';
import FilterProduct from '../components/FilterProduct';
import useLocalStorage from '../hooks/useLocalStorage';
import useInternetStatus from '../hooks/useInternetStatus';
import { OfflineContext } from '../context.js/contextOffline';
import useFilteredArray from '../hooks/useFilteredArray';
import PrintProduct from '../components/PrintProduct';

const renderItem = ({ item, navigation, isConnected }) => {
  
  return(
    <Pressable style={styles.item} onPress={()=>{
      if(!isConnected){
        return
      }
      navigation.navigate('DetailsProduct', {
            id: item._id,
            name: item.descripcion,
          })
    }}>
        <View>
            <Text style={styles.titleProduct}>{item.descripcion}</Text>
            <Text style={{fontSize: 14, color: '#7F8487'}}>{item.NameCategoria}</Text>
        </View>
        <View>
          <Text style={{fontSize: 18, color: '#FA9B50', fontFamily: 'Cairo-Bold'}}>$ {item.precioUnitario}</Text>
            <Text style={{fontSize: 14, color: '#7F8487'}}>{item.NameMarca}</Text>
        </View>
    </Pressable>
  );
}
export default function Product({navigation}) {

    const user = useAppSelector(getUser) 
    const {data: userStorage} = useLocalStorage([],'user')
    const loading = useAppSelector(getLoading)
    const dispatch = useAppDispatch();
    const [data, setData] = useState([])
    const [dataSearch, setDataSearch] = useState([])
    const [query, setQuery] = useState({skip: 0, limit: 15})
    const [openUpdate, setOpenUpdate] = useState(false)
    const [activeCategorie, setActiveCategorie] = useState({_id: 1 , descripcion: 'Todas'})
    const [activeBrand, setActiveBrand] = useState({_id: 1 , descripcion: 'Todas'})
    const [activeProvider, setActiveProvider] = useState({_id: 1 , descripcion: 'Todas'})
    const [openFilter, setOpenFilter] = useState(false)
    const isConnected = useInternetStatus();
    const {data: productLocalStorage} = useLocalStorage([],'productStorage')
    const fechaHoy = new Date()
    const [openPrint, setOpenPrint] = useState(false)
    
    const {data: offlineStorage, saveData: setOfflineStorage} = useLocalStorage(true,'offlineStorage')

    console.log(fechaHoy)

    const search = useInputValue('','')
    
    const filteredArray = useFilteredArray(productLocalStorage, search.value);

    const {offline} = useContext(OfflineContext)

    const getProduct = (skip, limit) => {
      dispatch(setLoading({
        message: `Actualizando productos`
      }))
        apiClient.post(`/product/skip`, {skip, limit},
        {
            headers: {
              Authorization: `Bearer ${user.token || userStorage.token}` // Agregar el token en el encabezado como "Bearer {token}"
            },
        })
        .then(response=>{
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
            dispatch(clearLoading())
        })
        .catch(e=>{console.log("error", e);dispatch(clearLoading())})
    }

    const getProductSearch = (input, categorie, brand, provider) => {
      dispatch(setLoading({
        message: `Actualizando productos`
      }))
      apiClient.post(`/product/search`, {input, categoria: categorie, marca: brand, proveedor: provider},
        {
          headers: {
            Authorization: `Bearer ${user.token || userStorage.token}` // Agregar el token en el encabezado como "Bearer {token}"
          },
      }
      )
      .then(response=>{
          setDataSearch(response.data)
          ;dispatch(clearLoading())
      })
      .catch(e=>{console.log("error", e);dispatch(clearLoading())})
    }

    useEffect(()=>{
      getProduct(query.skip, query.limit)
    },[query])

    useEffect(()=>{
      if (search) {
        getProductSearch(search.value, activeCategorie._id, activeBrand._id, activeProvider._id)
      }
    },[search.value , activeBrand, activeCategorie, activeProvider])

    useEffect(()=>{
      const socket = io('https://apigolozur.onrender.com')
      socket.on(`product`, (socket) => {
        refreshProducts()
        setData((prevData)=>{
          const exist = prevData.find((elem) => elem._id === socket.data._id )
          if (exist) {
            return prevData.map((item) =>
              item._id === socket.data._id ? socket.data : item
            )
          }
          return [...prevData]
        })
      })
      return () => {
        socket.disconnect();
      }; 
    },[data])

  const refreshProducts = () => {
    search.clearValue()
    getProduct(query.skip, query.limit)
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshProducts()
    });

    return unsubscribe
  }, [navigation]);

  
  return (
    <View>
      {
        !offlineStorage ?
        <View>
          <Search placeholder={'Buscar producto'} searchInput={search} handleOpenFilter={()=>setOpenFilter(true)} />
          <View style={{paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', margin: 15}} >
            <Button text={'Nuevo'} fontSize={14} width={'25%'} onPress={()=>{navigation.navigate('NewProduct')}}  />
            <Button text={'Actualizar'} fontSize={14} width={'30%'} onPress={()=>setOpenUpdate(true)} />
            <Button text={'Imprimir'} fontSize={14} width={'25%'} onPress={()=>setOpenPrint(true)} />
          </View>
          <Text style={{fontSize: 18, fontFamily: 'Cairo-Regular', color: '#799351', paddingHorizontal: 15 }} >Estas en modo con conexion</Text>
          <FlatList
            style={{height: '83%'}}
            data={search.value !== '' || activeBrand._id !== 1 || activeCategorie._id !== 1 || activeProvider._id !== 1 ? 
              dataSearch : 
              data
            }
            renderItem={({ item }) => renderItem({ item, navigation, isConnected })}
            keyExtractor={(item) => item._id}
            onEndReached={()=>{
              if(!loading.open){
                if(search){
                  if(search.value === ''){
                    dispatch(setLoading({
                        message: `Cargando nuevos productos`
                    }))
                    setQuery({skip: query.skip+15, limit: query.limit})
                  }
                }
              }
            }}
          />
          <UpdatePrice open={openUpdate} onClose={()=>setOpenUpdate(false)} updateQuery={refreshProducts} />
          <FilterProduct open={openFilter} onClose={()=>setOpenFilter(false)} activeBrand={activeBrand._id} activeCategorie={activeCategorie._id} activeProvider={activeProvider._id}
            selectCategorie={(item)=>setActiveCategorie(item)}
            selectBrand={(item)=>setActiveBrand(item)}
            selectProvider={(item)=>setActiveProvider(item)}
          />
          <PrintProduct  
            open={openPrint} onClose={()=>setOpenPrint(false)}
          />
        </View>
        :
        <View>
          <Search placeholder={'Buscar producto'} searchInput={search} />
          <Text style={{fontSize: 18, fontFamily: 'Cairo-Regular', color: '#C7253E', paddingHorizontal: 15 }} >Estas en modo sin conexion</Text>
          <FlatList
            style={{height: '83%'}}
            data={filteredArray}
            renderItem={({ item }) => renderItem({ item, navigation, isConnected })}
            keyExtractor={(item) => item._id}
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
      flexDirection: 'row',
      justifyContent: 'space-between'
    },
    titleProduct: {
      fontSize: 18,
      fontFamily: 'Cairo-Bold',
      color: '#252525'
    },
  });