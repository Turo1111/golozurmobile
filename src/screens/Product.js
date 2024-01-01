import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import apiClient from '../utils/client'
import { getUser } from '../redux/userSlice';
import { useAppDispatch, useAppSelector } from '../redux/hook';
import { clearLoading, getLoading, setLoading } from '../redux/loadingSlice';
import Search from '../components/Search';
import Button from '../components/Button';
import {useInputValue} from '../hooks/useInputValue'
import { io } from 'socket.io-client';
import UpdatePrice from '../components/UpdatePrice';

const renderItem = ({ item, navigation }) => {
  /* console.log(item.descripcion); */
  return(
    <Pressable style={styles.item} onPress={()=>{
      navigation.navigate('DetailsProduct', {
            id: item._id,
            name: item.descripcion,
          })
    }}>
        <View>
            <Text style={styles.titleProduct}>{item.descripcion}</Text>
            <Text style={{fontSize: 14, color: '#7F8487'}}>{item.categoria}</Text>
        </View>
        <View>
          <Text style={{fontSize: 18, color: '#FA9B50', fontFamily: 'Cairo-Bold'}}>$ {item.precioUnitario}</Text>
            <Text style={{fontSize: 14, color: '#7F8487'}}>{item.marca}</Text>
        </View>
    </Pressable>
  );
}
export default function Product({navigation}) {

    const user = useAppSelector(getUser);
    const loading = useAppSelector(getLoading)
    const dispatch = useAppDispatch();
    const [data, setData] = useState([])
    const [dataSearch, setDataSearch] = useState([])
    const [query, setQuery] = useState({skip: 0, limit: 15})
    const [openUpdate, setOpenUpdate] = useState(false)

    const search = useInputValue('','')

    const getProduct = (skip, limit) => {
        apiClient.post(`/product/skip`, {skip, limit},
        {
            headers: {
              Authorization: `Bearer ${user.token}` // Agregar el token en el encabezado como "Bearer {token}"
            },
        })
        .then(response=>{
            setData((prevData)=>{
                if (prevData.length === 0) {
                    return response.data
                }
                const newData = response.data.filter((element) => {
                  return prevData.findIndex((item) => item._id === element._id) === -1;
                });
                /* console.log([...prevData, ...newData]); */
                return [...prevData, ...newData];
            })
            dispatch(clearLoading())
        })
        .catch(e=>console.log("error", e))
    }

    const getProductSearch = (input) => {
      apiClient.post(`/product/search`, {input},
      {
          headers: {
            Authorization: `Bearer ${user.token}` // Agregar el token en el encabezado como "Bearer {token}"
          },
      })
      .then(response=>{
          setDataSearch(response.data)
          dispatch(clearLoading())
      })
      .catch(e=>console.log("error", e))
    }

    useEffect(()=>{
      getProduct(query.skip, query.limit)
    },[query])

    useEffect(()=>{
      if (search) {
        if (search.value !== '') {
          getProductSearch(search.value)
        }
      }
    },[search])

    useEffect(()=>{
      const socket = io('https://apigolozur.onrender.com')
      socket.on(`/product`, (socket) => {
        console.log("escucho socket",socket);
        refreshProducts()
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
        <Search placeholder={'Buscar producto'} searchInput={search} />
        <View style={{paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 15}} >
          <Button text={'Nuevo'} fontSize={14} width={'20%'} onPress={()=>{navigation.navigate('NewProduct')}} />
          <Button text={'Actualizar'} fontSize={14} width={'20%'} onPress={()=>setOpenUpdate(true)} />
        </View>
        <FlatList
          style={{height: '83%'}}
          data={search && (search.value === '' ? data : dataSearch)}
          renderItem={({ item }) => renderItem({ item, navigation })}
          keyExtractor={(item) => item._id}
          onEndReached={()=>{
            console.log('estoy en el final')
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