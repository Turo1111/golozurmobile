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
import FilterProduct from '../components/FilterProduct';

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

    const user = useAppSelector(getUser);
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

    const getProductSearch = (input, categorie, brand, provider) => {
      apiClient.post(`/product/search`, {input, categoria: categorie, marca: brand, proveedor: provider})
      .then(response=>{
          setDataSearch(response.data)
      })
      .catch(e=>console.log("error", e))
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
      const socket = io('http://10.0.2.2:3002')
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
        <Search placeholder={'Buscar producto'} searchInput={search} handleOpenFilter={()=>setOpenFilter(true)} />
        <View style={{paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 15}} >
          <Button text={'Nuevo'} fontSize={14} width={'20%'} onPress={()=>{navigation.navigate('NewProduct')}} />
          <Button text={'Actualizar'} fontSize={14} width={'20%'} onPress={()=>setOpenUpdate(true)} />
        </View>
        <FlatList
          style={{height: '83%'}}
          data={search.value !== '' || activeBrand._id !== 1 || activeCategorie._id !== 1 || activeProvider._id !== 1 ? 
            dataSearch : 
            data
          }
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
        <FilterProduct open={openFilter} onClose={()=>setOpenFilter(false)} activeBrand={activeBrand._id} activeCategorie={activeCategorie._id} activeProvider={activeProvider._id}
          selectCategorie={(item)=>setActiveCategorie(item)}
          selectBrand={(item)=>setActiveBrand(item)}
          selectProvider={(item)=>setActiveProvider(item)}
        />
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