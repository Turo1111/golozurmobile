import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hook';
import { getUser } from '../redux/userSlice';
import { clearLoading, getLoading, setLoading } from '../redux/loadingSlice';
import { io } from 'socket.io-client';
import { useInputValue } from '../hooks/useInputValue';
import Search from '../components/Search';
import FilterProduct from '../components/FilterProduct';
import apiClient from '../utils/client';
import MyBottomSheet from '../components/MyBottomSheet';
import SliderSale from '../components/SliderSale';
import CartSale from '../components/CartSale';
import ResumeBottomSheet from '../components/ResumeBottomSheet';
import { setAlert } from '../redux/alertSlice';
import useLocalStorage from '../hooks/useLocalStorage';
import useInternetStatus from '../hooks/useInternetStatus';
import { OfflineContext } from '../context.js/contextOffline';
import useFilteredArray from '../hooks/useFilteredArray';
import AddProduct from '../components/AddProduct';

const renderItem = ({ item, navigation, addSelectProduct }) => {
  return(
    <Pressable style={styles.item} onPress={()=>addSelectProduct(item)}>
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

export default function NewSale({navigation}) {

  const user = useAppSelector(getUser) 
  const {data: userStorage} = useLocalStorage([],'user')
    const loading = useAppSelector(getLoading)
    const dispatch = useAppDispatch();
    const [data, setData] = useState([])
    const [dataSearch, setDataSearch] = useState([])
    const [query, setQuery] = useState({skip: 0, limit: 15})
    const [activeCategorie, setActiveCategorie] = useState({_id: 1 , descripcion: 'Todas'})
    const [activeBrand, setActiveBrand] = useState({_id: 1 , descripcion: 'Todas'})
    const [activeProvider, setActiveProvider] = useState({_id: 1 , descripcion: 'Todas'})
    const [openFilter, setOpenFilter] = useState(false)
    const [openBS, setOpenBS] = useState(false)
    const [lineaVenta, setLineaVenta] = useState([])
    const [total, setTotal] = useState(0)
    const {data: saleStorage, saveData: setSaleStorage} = useLocalStorage([],'saleStorage')
    const [selectProduct, setSelectProduct] = useState(undefined)
    const [openAddProduct, setOpenAddProduct] = useState(false)

    const cliente = useInputValue('','')
    const search = useInputValue('','')
    const porcentaje = useInputValue('0','number')

    const {offline, trueSaleStorage} = useContext(OfflineContext)

    const {data: productLocalStorage} = useLocalStorage([],'productStorage')

    const filteredArray = useFilteredArray(productLocalStorage, search.value);

    const getProduct = (skip, limit) => {
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
      if(!offline){
        console.log('buscando offline')
        return
      }
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

  useEffect(()=>{
    const sumWithInitial = lineaVenta.reduce(
        (accumulator, currentValue) => {
          let suma = parseFloat(accumulator) + parseFloat(currentValue.total)
          if (parseFloat(porcentaje.value) > 0) {
            return (suma + (suma * (parseFloat(porcentaje.value)/100)))
          }
          return suma
        },
        0,
    );
    setTotal(prevData=>parseFloat(parseFloat(sumWithInitial).toFixed(2)))
  },[lineaVenta, porcentaje])

  const addCart = (item, cantidad, totalLV) => {
    setLineaVenta((prevData)=>{
        const exist = prevData.find((elem)=>elem._id===item._id)
        if (exist) {
            return prevData.map((elem) =>
                elem._id === item._id ? {...item, cantidad: cantidad, total: totalLV} : elem
            )
        }
        return [...prevData, {...item, cantidad: cantidad, total: totalLV, idProducto: item._id}]
    })
  }

  const addSelectProduct = (item) => {
    setSelectProduct(prevData=>item)
    setOpenAddProduct(true)
  }

  useEffect(()=>{
    const socket = io('http://10.0.2.2:3002')
    socket.on(`/sale`, (socket) => {
        console.log('escucho', socket)
      /* getSale() */
    })
    return () => {
      socket.disconnect();
    }; 
  },[data])

  return (
    <SafeAreaView style={styles.content}  >
        <Search placeholder={'Buscar producto'} searchInput={search} handleOpenFilter={()=>{offline && setOpenFilter(true)}} />
        <Text style={{fontSize: 18, fontFamily: 'Cairo-Regular', color: `${!offline ? '#C7253E':'#799351'}`, paddingHorizontal: 15 }} >{!offline ? 'Estas en modo sin conexion' : 'Estas en modo con conexion'}</Text>
        <FlatList
          style={{height: '83%'}}
          data={
            !offline ? filteredArray :
            (search.value !== '' || activeBrand._id !== 1 || activeCategorie._id !== 1 || activeProvider._id !== 1 ? 
            dataSearch : 
            data)
          }
          renderItem={({ item }) => renderItem({ item, navigation, addSelectProduct })}
          keyExtractor={(item) => item._id}
          onEndReached={()=>{
            console.log('estoy en el final')
            if(!loading.open){
              if(search){
                if(search.value === ''){
                  setQuery({skip: query.skip+15, limit: query.limit})
                }
              }
            }
          }}
        />
        <FilterProduct open={openFilter} onClose={()=>setOpenFilter(false)} activeBrand={activeBrand._id} activeCategorie={activeCategorie._id} activeProvider={activeProvider._id}
          selectCategorie={(item)=>setActiveCategorie(item)}
          selectBrand={(item)=>setActiveBrand(item)}
          selectProvider={(item)=>setActiveProvider(item)}
        />
        {
          selectProduct &&
          <AddProduct open={openAddProduct} onClose={()=>setOpenAddProduct(false)} product={selectProduct} addCart={(item, cantidad, totalLV)=>addCart(item,cantidad, totalLV)} />
        }
        <ResumeBottomSheet onPress={() => setOpenBS(true)} totalCart={total} longCart={lineaVenta.length}  />
        <MyBottomSheet open={openBS} onClose={()=>setOpenBS(false)} fullScreen={true} >
          <SliderSale itemSlide={[
            <CartSale cliente={cliente} lineaVenta={lineaVenta} total={total} porcentaje={porcentaje}
                onClick={(item)=>setLineaVenta((prevData)=>prevData.filter((elem)=>elem._id!==item._id))}
                upQTY={(id)=>setLineaVenta((prevData)=>prevData.map((elem)=>{
                  return elem._id===id ? {...elem, cantidad: elem.cantidad+1, total: (elem.precioUnitario*(elem.cantidad+1)).toFixed(2)} : elem
                }))}
                downQTY={(id)=>setLineaVenta((prevData)=>prevData.map((elem)=>{
                  if (elem._id===id) {
                    if (elem.cantidad-1 > 1 ) {
                      return {...elem, cantidad: elem.cantidad-1, total: (elem.precioUnitario*(elem.cantidad-1)).toFixed(2)}
                    }
                    return {...elem, cantidad: 1, total: elem.precioUnitario}
                  }
                  return elem
                }))}
                upQTY10={(id)=>setLineaVenta((prevData)=>prevData.map((elem)=>{
                  return elem._id===id ? {...elem, cantidad: elem.cantidad+10, total: (elem.precioUnitario*(elem.cantidad+10)).toFixed(2)} : elem
                }))}
                downQTY10={(id)=>setLineaVenta((prevData)=>prevData.map((elem)=>{
                  if (elem._id===id) {
                    if (elem.cantidad > 10 ) {
                      return {...elem, cantidad: elem.cantidad-10, total: (elem.precioUnitario*(elem.cantidad-10)).toFixed(2)}
                    }
                    return elem
                  }
                  return elem
                }))}
            />
          ]} onCloseSheet={()=>setOpenBS(false)} finishSale={
            async()=>{
              console.log(user, userStorage)
                if (lineaVenta.length===0 || total <= 0) {
                  dispatch(setAlert({
                    message: `No se agregaron productos al carrito`,
                    type: 'warning'
                  }))
                  return
                }
                if (cliente.value==='') {
                  console.log('no se ingreso ningun cliente')
                  dispatch(setAlert({
                    message: `No se ingreso ningun cliente`,
                    type: 'warning'
                  }))
                  return
                }
                if(!offline){
                  await setSaleStorage([...saleStorage, {itemsSale: lineaVenta, cliente: cliente.value, total: total, estado: 'Entregado', porcentaje: porcentaje.value}])
                  trueSaleStorage()
                  navigation.navigate('Sale')
                  return
                }
                apiClient.post('/sale', {itemsSale: lineaVenta, cliente: cliente.value, total: total, estado: 'Entregado', porcentaje: porcentaje.value},{
                  headers: {
                    Authorization: `Bearer ${user.token || userStorage.token}` 
                  }
                })
                .then((r)=>{
                  navigation.navigate('Sale')
                })
                .catch((e)=>console.log('error post sale',e))
              }
          } />
        </MyBottomSheet>
    </SafeAreaView>
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
  content: {
      position: 'relative',
      backgroundColor: '#Fff',
      height: '100%'
  },
});