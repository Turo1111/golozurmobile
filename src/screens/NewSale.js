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
import AlertPostSale from '../components/AlertPostSale';

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';


const formatDate = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Los meses van de 0 a 11
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const renderItem = ({ item, navigation, addSelectProduct }) => {
  return (
    <Pressable style={styles.item} onPress={() => addSelectProduct(item)}>
      <View>
        <Text style={styles.titleProduct}>{item.descripcion}</Text>
        <Text style={{ fontSize: 14, color: '#7F8487' }}>{item.NameCategoria}</Text>
      </View>
      <View>
        <Text style={{ fontSize: 18, color: '#FA9B50', fontFamily: 'Cairo-Bold' }}>$ {item.precioUnitario}</Text>
        <Text style={{ fontSize: 14, color: '#7F8487' }}>{item.NameMarca}</Text>
      </View>
    </Pressable>
  );
}

export default function NewSale({ navigation }) {

  const user = useAppSelector(getUser)
  const { data: userStorage } = useLocalStorage([], 'user')
  const loading = useAppSelector(getLoading)
  const dispatch = useAppDispatch();
  const [data, setData] = useState([])
  const [dataSearch, setDataSearch] = useState([])
  const [query, setQuery] = useState({ skip: 0, limit: 15 })
  const [activeCategorie, setActiveCategorie] = useState({ _id: 1, descripcion: 'Todas' })
  const [activeBrand, setActiveBrand] = useState({ _id: 1, descripcion: 'Todas' })
  const [activeProvider, setActiveProvider] = useState({ _id: 1, descripcion: 'Todas' })
  const [openFilter, setOpenFilter] = useState(false)
  const [openBS, setOpenBS] = useState(false)
  const [lineaVenta, setLineaVenta] = useState([])
  const [total, setTotal] = useState(0)
  const { data: saleStorage, saveData: setSaleStorage } = useLocalStorage([], 'saleStorage')
  const [selectProduct, setSelectProduct] = useState(undefined)
  const [openAddProduct, setOpenAddProduct] = useState(false)
  const [openAlertPost, setOpenAlertPost] = useState(false)
  const today = new Date()
  const { data: offlineStorage, saveData: setOfflineStorage } = useLocalStorage(true, 'offlineStorage')

  const cliente = useInputValue('', '')
  const search = useInputValue('', '')
  const porcentaje = useInputValue('0', 'number')

  const { offline, trueSaleStorage } = useContext(OfflineContext)

  const { data: productLocalStorage } = useLocalStorage([], 'productStorage')

  const filteredArray = useFilteredArray(productLocalStorage, search.value);

  const getProduct = (skip, limit) => {
    apiClient.post(`/product/skip`, { skip, limit },
      {
        headers: {
          Authorization: `Bearer ${user.token || userStorage.token}` // Agregar el token en el encabezado como "Bearer {token}"
        },
      })
      .then(response => {
        setData((prevData) => {
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
      .catch(e => console.log("error", e))
  }

  const getProductSearch = (input, categorie, brand, provider) => {

    apiClient.post(`/product/search`, { input, categoria: categorie, marca: brand, proveedor: provider })
      .then(response => {
        setDataSearch(response.data)
      })
      .catch(e => { console.log("error", e); })
  }

  useEffect(() => {
    if (!offlineStorage) {
      getProduct(query.skip, query.limit)
    }
  }, [query, offlineStorage])

  useEffect(() => {
    if (search) {
      getProductSearch(search.value, activeCategorie._id, activeBrand._id, activeProvider._id)
    }
  }, [search.value, activeBrand, activeCategorie, activeProvider])

  useEffect(() => {
    const socket = io('http://10.0.2.2:5000')
    socket.on(`/product`, (socket) => {
      console.log("escucho socket", socket);
      refreshProducts()
    })
    return () => {
      socket.disconnect();
    };
  }, [data])

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

  useEffect(() => {
    console.log(lineaVenta)
    const sumWithInitial = lineaVenta.reduce(
      (accumulator, currentValue) => {
        let suma = parseFloat(accumulator) + parseFloat(currentValue.total)
        if (parseFloat(porcentaje.value) > 0) {
          return (suma + (suma * (parseFloat(porcentaje.value) / 100)))
        }
        return suma
      },
      0,
    );
    setTotal(prevData => parseFloat(parseFloat(sumWithInitial).toFixed(2)))
  }, [lineaVenta, porcentaje])

  const addCart = (item, cantidad, totalLV, precioUnitario) => {
    setLineaVenta((prevData) => {
      const exist = prevData.find((elem) => elem._id === item._id)
      if (exist) {
        return prevData.map((elem) =>
          elem._id === item._id ? { ...item, cantidad: cantidad, total: totalLV, precioUnitario: precioUnitario } : elem
        )
      }
      return [...prevData, { ...item, cantidad: cantidad, total: totalLV, idProducto: item._id, precioUnitario: precioUnitario }]
    })
  }

  const addSelectProduct = (item) => {
    setSelectProduct(prevData => item)
    setOpenAddProduct(true)
  }

  const postOffline = async () => {
    let today = new Date()
    let formatToday = today.toISOString()
    await setSaleStorage([...saleStorage, { createdAt: formatToday, itemsSale: lineaVenta, cliente: cliente.value, total: total, estado: 'Entregado', porcentaje: porcentaje.value }])
    trueSaleStorage()
    setOpenAlertPost(true)
  }

  const postSale = async () => {
    if (lineaVenta.length === 0 || total <= 0) {
      dispatch(setAlert({
        message: `No se agregaron productos al carrito`,
        type: 'warning'
      }))
      return
    }
    if (cliente.value === '') {
      dispatch(setAlert({
        message: `No se ingreso ningun cliente`,
        type: 'warning'
      }))
      return
    }
    if (offlineStorage) {
      postOffline()
      return
    }
    dispatch(setLoading({
      message: `dproductos`
    }))
    apiClient.post('/sale', { itemsSale: lineaVenta, cliente: cliente.value, total: total, estado: 'Entregado', porcentaje: porcentaje.value }, {
      headers: {
        Authorization: `Bearer ${user.token || userStorage.token}`
      }
    })
      .then((r) => {
        dispatch(clearLoading());
      })
      .catch((e) => { console.log('error post sale', e); dispatch(clearLoading()); })
    setOpenAlertPost(true)
  }

  const generatePdf = async (cliente) => {
    let details = undefined;
    if (offlineStorage) {
      try {
        const jsonValue = await AsyncStorage.getItem('saleStorage');
        if (jsonValue !== null) {
          const value = JSON.parse(jsonValue);
          details = await value.find(elem => elem.cliente === cliente);
        }
      } catch (e) {
        dispatch(setAlert({
          message: 'Hubo un error al obtener la venta 1',
          type: 'error'
        }));
      }
    } else {
      await apiClient.get(`/sale/${cliente}`, {
        headers: {
          Authorization: `Bearer ${user.token || userStorage.token}`
        },
      })
        .then(r => {
          console.log(r.data);
          details = {
            itemsSale: r.data.itemsSale,
            cliente: r.data.r.cliente,
            total: r.data.r.total,
            createdAt: r.data.r.createdAt
          };
        })
        .catch(e => {
          dispatch(setAlert({
            message: 'Hubo un error al obtener la venta 1',
            type: 'error'
          }));
        });
    }

    console.log(details);

    if (!details) {
      dispatch(setAlert({
        message: 'Hubo un error al obtener la venta 2',
        type: 'error'
      }));
      return;
    }

    const chunkArray = (array, size) => {
      const result = [];
      for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
      }
      return result;
    };

    const itemsChunks = chunkArray(details.itemsSale, 15);

    const generateHtmlContent = (items, chunkIndex, totalChunks) => {
      const itemsText = items.map(item => `
        <div class="it">
          <p class="it">${(item.descripcion).toUpperCase()}</p>
          <div class="itemList">
            <div class="flex">
              <p class="it">${item.cantidad}x</p>
              <p class="it">$${(item.precio || item.precioUnitario).toString().toLocaleString('es-ES')}</p>
            </div>
            <p class="it">$${(item.total).toString().toLocaleString('es-ES')}</p>
          </div>
        </div>
      `).join('');

      return `
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
              .itemList {
                display: flex;
                padding: 0px 3px;
                margin: 0;
                padding: 0;
                justify-content: space-between;
              }
              .it {
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
              ${totalChunks > 1 ? `<p>Ticket ${chunkIndex + 1} de ${totalChunks}</p>` : ''}
            </div>
            <hr/>
            <div class="details">
              ${itemsText}
            </div>
            <hr/>
            ${chunkIndex === totalChunks - 1 ? `
              <div class="total">
                <p>Total Neto $ ${(details.total).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            ` : ''}
          </body>
        </html>
      `;
    };

    try {
      for (let i = 0; i < itemsChunks.length; i++) {
        const htmlContent = generateHtmlContent(itemsChunks[i], i, itemsChunks.length);
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
      }
    } catch (error) {
      console.error('Error generando el PDF:', error);
    }
  };

  useEffect(() => {
    const socket = io('http://10.0.2.2:5000')
    socket.on(`/sale`, (socket) => {
    })
    return () => {
      socket.disconnect();
    };
  }, [data])

  return (
    <SafeAreaView style={styles.content}  >
      <Search placeholder={'Buscar producto'} searchInput={search} handleOpenFilter={() => { !offlineStorage && setOpenFilter(true) }} />
      <Text style={{ fontSize: 18, fontFamily: 'Cairo-Regular', color: `${offlineStorage ? '#C7253E' : '#799351'}`, paddingHorizontal: 15 }} >{offlineStorage ? 'Estas en modo sin conexion' : 'Estas en modo con conexion'}</Text>
      <FlatList
        style={{ height: '83%' }}
        data={
          offlineStorage ? filteredArray :
            (search.value !== '' || activeBrand._id !== 1 || activeCategorie._id !== 1 || activeProvider._id !== 1 ?
              dataSearch :
              data)
        }
        renderItem={({ item }) => renderItem({ item, navigation, addSelectProduct })}
        keyExtractor={(item) => item._id}
        onEndReached={() => {
          console.log('estoy en el final')
          if (!loading.open) {
            if (search) {
              if (search.value === '') {
                setQuery({ skip: query.skip + 15, limit: query.limit })
              }
            }
          }
        }}
      />
      <FilterProduct open={openFilter} onClose={() => setOpenFilter(false)} activeBrand={activeBrand._id} activeCategorie={activeCategorie._id} activeProvider={activeProvider._id}
        selectCategorie={(item) => setActiveCategorie(item)}
        selectBrand={(item) => setActiveBrand(item)}
        selectProvider={(item) => setActiveProvider(item)}
      />
      {
        selectProduct &&
        <AddProduct open={openAddProduct} onClose={() => setOpenAddProduct(false)} product={selectProduct} addCart={(item, cantidad, totalLV, precioUnitario) => addCart(item, cantidad, totalLV, precioUnitario)}
        /* onChangePrecioUnitario={(value, idProduct)=>{
          let parseValue = parseFloat(value)
          if (value === '') {
            parseValue = 0
          }
          console.log(parseValue, idProduct)
          setLineaVenta((prevData)=>{
            const itemSale = prevData.find(elem=>elem._id === idProduct)
            if(!itemSale){
              return prevData
            }
            const newItemSale = {...itemSale, precioUnitario: parseValue, total: itemSale?.cantidad*parseValue}
            const prevFiltered = prevData.map((elem)=>elem._id===idProduct ? newItemSale : elem)
            return prevFiltered
          })
        }} */
        />
      }
      {
        openAlertPost &&
        <AlertPostSale open={openAlertPost} onClose={() => navigation.navigate('Sale')} post={() => navigation.navigate('Sale')} print={() => generatePdf()} />
      }
      <ResumeBottomSheet onPress={() => setOpenBS(true)} totalCart={total} longCart={lineaVenta.length} />
      <MyBottomSheet open={openBS} onClose={() => setOpenBS(false)} fullScreen={true} >
        <SliderSale itemSlide={[
          <CartSale cliente={cliente} lineaVenta={lineaVenta} total={total} porcentaje={porcentaje}
            onClick={(item) => setLineaVenta((prevData) => prevData.filter((elem) => elem._id !== item._id))}
            upQTY={(id) => setLineaVenta((prevData) => prevData.map((elem) => {
              return elem._id === id ? { ...elem, cantidad: elem.cantidad + 1, total: (elem.precioUnitario * (elem.cantidad + 1)).toFixed(2) } : elem
            }))}
            downQTY={(id) => setLineaVenta((prevData) => prevData.map((elem) => {
              if (elem._id === id) {
                if (elem.cantidad - 1 > 1) {
                  return { ...elem, cantidad: elem.cantidad - 1, total: (elem.precioUnitario * (elem.cantidad - 1)).toFixed(2) }
                }
                return { ...elem, cantidad: 1, total: elem.precioUnitario }
              }
              return elem
            }))}
            upQTY10={(id) => setLineaVenta((prevData) => prevData.map((elem) => {
              return elem._id === id ? { ...elem, cantidad: elem.cantidad + 10, total: (elem.precioUnitario * (elem.cantidad + 10)).toFixed(2) } : elem
            }))}
            downQTY10={(id) => setLineaVenta((prevData) => prevData.map((elem) => {
              if (elem._id === id) {
                if (elem.cantidad > 10) {
                  return { ...elem, cantidad: elem.cantidad - 10, total: (elem.precioUnitario * (elem.cantidad - 10)).toFixed(2) }
                }
                return elem
              }
              return elem
            }))}
          />
        ]} onCloseSheet={() => setOpenBS(false)} finishSale={postSale} />
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