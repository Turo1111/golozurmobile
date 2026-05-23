import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hook';
import { getUser } from '../redux/userSlice';
import { clearLoading, setLoading } from '../redux/loadingSlice';
import { io } from 'socket.io-client';
import { useInputValue } from '../hooks/useInputValue';
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
import Constants from 'expo-constants';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import usePermissionCheck from '../hooks/usePermissionCheck';
import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SelectClient from '../components/SelectClient';
import useProductListController from '../hooks/useProductListController';

const DB_HOST = Constants.expoConfig?.extra?.DB_HOST;

const formatDate = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Los meses van de 0 a 11
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};


const renderItem = ({ item, navigation, addSelectProduct }) => {
  // Lógica de stock
  let stockLabel = '';
  let stockColor = '';
  if (item.stock === 0) {
    stockLabel = 'Sin Stock';
    stockColor = '#C7253E';
  } else if (item.stock > 0 && item.stock <= 5) {
    stockLabel = `Stock Bajo: ${item.stock}`;
    stockColor = '#FA9B50';
  } else {
    stockLabel = `Stock: ${item.stock}`;
    stockColor = '#4CAF50';
  }
  return (
    <Pressable style={styles.productCard} onPress={() => addSelectProduct(item)}>
      <View style={{ flex: 1 }}>
        <Text style={styles.productTitle}>{item.descripcion}</Text>
        <Text style={styles.productSubtitle}>{`${item.NameCategoria || ''}${item.NameCategoria && item.NameMarca ? ' - ' : ''}${item.NameMarca || ''}`}</Text>
        <View style={styles.productTagsRow}>
          <View style={[styles.productTag, { backgroundColor: stockColor + '22', borderColor: stockColor }]}>
            <Text style={{ color: stockColor, fontSize: 12 }}>{stockLabel}</Text>
          </View>
          <View style={[styles.productTag, { backgroundColor: '#f3f6fa', borderColor: '#2563eb' }]}>
            <Text style={{ color: '#2563eb', fontSize: 12 }}>{`ID: ${item.codigo || (item._id ? item._id.slice(-3) : '---')}`}</Text>
          </View>
          <View style={[styles.productTag, { backgroundColor: '#fff3cd', borderColor: '#ffc107' }]}>
            <Text style={{ color: '#ffc107', fontSize: 12 }}>{`Sabor: ${item.sabor || ('---')}`}</Text>
          </View>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', minWidth: 80 }}>
        <Text style={styles.productPrice}>{`$${Number(item.precioUnitario).toFixed(2)}`}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(56, 47, 47, 0.05)', borderRadius: 10, padding: 5, marginTop: 20 }}>
          <Icon name="chevron-right" size={20} color="#b0b0b0" />
        </View>
      </View>
    </Pressable>
  );
}

const HEADER_BLUE = '#2563eb';

export default function NewSale({ navigation }) {

  const user = useAppSelector(getUser)
  const { data: userStorage } = useLocalStorage([], 'user')
  const dispatch = useAppDispatch();
  const [activeCategorie, setActiveCategorie] = useState({ _id: null, descripcion: 'Todas' })
  const [activeBrand, setActiveBrand] = useState({ _id: null, descripcion: 'Todas' })
  const [activeProvider, setActiveProvider] = useState({ _id: null, descripcion: 'Todas' })
  const [openFilter, setOpenFilter] = useState(false)
  const [openBS, setOpenBS] = useState(false)
  const [lineaVenta, setLineaVenta] = useState([])
  const [total, setTotal] = useState(0)
  //const { data: saleStorage, saveData: setSaleStorage } = useLocalStorage([], 'saleStorage')
  const [selectProduct, setSelectProduct] = useState(undefined)
  const [openAddProduct, setOpenAddProduct] = useState(false)
  const [openAlertPost, setOpenAlertPost] = useState(false)
  const today = new Date()
  //const { data: offlineStorage, saveData: setOfflineStorage } = useLocalStorage(true, 'offlineStorage')
  const { createSale } = useContext(OfflineContext)
  const [idCliente, setIdCliente] = useState(null)

  const { hasPermission: hasPermissionCreateSale, isLoading: isLoadingCreateSale } = usePermissionCheck('create_sale', () => { })

  const cliente = useInputValue('', '')
  const search = useInputValue('', '')
  const porcentaje = useInputValue('0', 'number')

  const [offline, setOffline] = useState(false)
  const isConnected = useInternetStatus()
  const focusReadyRef = useRef(false)

  const { data: productLocalStorage } = useLocalStorage([], 'productStorage')
  const localProducts = useMemo(() => {
    if (Array.isArray(productLocalStorage)) {
      return productLocalStorage
    }

    if (Array.isArray(productLocalStorage?.product)) {
      return productLocalStorage.product
    }

    return []
  }, [productLocalStorage])

  const {
    state,
    applyQueryChanges,
    loadNextPage,
    refresh,
    consumeRealtime,
    incrementPendingRealtime,
  } = useProductListController({
    mode: 'server',
    limit: 15,
  })

  const filteredArray = useFilteredArray(localProducts, search.value);

  useEffect(() => {
    if (!isConnected) {
      setOffline(true)
      return
    }

    setOffline(false)
  }, [isConnected])

  useEffect(() => {
    if (!offline) {
      applyQueryChanges({
        search: search.value,
        categoryId: activeCategorie?._id ?? null,
        brandId: activeBrand?._id ?? null,
        providerId: activeProvider?._id ?? null,
      }).catch((error) => {
        console.log('error new sale query', error)
        setOffline(true)
        dispatch(setAlert({
          message: `${error?.response?.data || 'No se pudo traer los productos, estas en modo offline'}`,
          type: 'error'
        }))
      })
    }
  }, [activeBrand?._id, activeCategorie?._id, activeProvider?._id, applyQueryChanges, dispatch, offline, search.value])

  useEffect(() => {
    const socket = io(DB_HOST)
    socket.on(`product`, () => {
      incrementPendingRealtime()
    })
    return () => {
      socket.disconnect();
    };
  }, [incrementPendingRealtime])

  const refreshProducts = useCallback(() => {
    if (offline) {
      return
    }

    refresh().catch((error) => {
      console.log('error refresh new sale products', error)
      dispatch(setAlert({
        message: `${error?.response?.data || 'No se pudo actualizar la lista de productos'}`,
        type: 'error'
      }))
    })
  }, [dispatch, offline, refresh])

  const applyPendingChanges = useCallback(() => {
    if (offline) {
      return
    }

    consumeRealtime().catch((error) => {
      console.log('error consume new sale realtime', error)
      dispatch(setAlert({
        message: `${error?.response?.data || 'No se pudo actualizar la lista con cambios pendientes'}`,
        type: 'error'
      }))
    })
  }, [consumeRealtime, dispatch, offline])

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!focusReadyRef.current) {
        focusReadyRef.current = true
        return
      }

      refreshProducts()
    });

    return unsubscribe
  }, [navigation, refreshProducts]);

  useEffect(() => {
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
    createSale({ createdAt: formatToday, itemsSale: lineaVenta, cliente: cliente.value, total: total, estado: 'Entregado', porcentaje: porcentaje.value })
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
    if (cliente.value === '' && idCliente === null) {
      dispatch(setAlert({
        message: `No se ingreso ningun cliente`,
        type: 'warning'
      }))
      return
    }
    /* if (offline) {
      postOffline()
      return
    } */
    dispatch(setLoading({
      message: `Guardando productos`
    }))
    apiClient.post('/sale', { itemsSale: lineaVenta, cliente: cliente.value, total: total, estado: 'Entregado', porcentaje: porcentaje.value, idCliente: idCliente }, {
      headers: {
        Authorization: `Bearer ${user.token || userStorage.token}`
      }
    })
      .then((r) => {

        dispatch(clearLoading());
      })
      .catch(async (e) => {
        postOffline()
        dispatch(clearLoading());
      })
    setOpenAlertPost(true)
  }

  const generatePdf = async (cliente) => {
    let details = undefined;
    if (offline) {
      dispatch(setLoading({
        message: `Obteniendo venta`
      }))
      try {
        const jsonValue = await AsyncStorage.getItem('saleStorage');
        if (jsonValue !== null) {
          const value = JSON.parse(jsonValue);
          details = await value.find(elem => elem.cliente === cliente);
        }
        dispatch(clearLoading());
      } catch (e) {
        dispatch(clearLoading());
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
          details = {
            itemsSale: r.data.itemsSale,
            cliente: r.data.r.cliente,
            total: r.data.r.total,
            createdAt: r.data.r.createdAt
          };
        })
        .catch(e => {
          dispatch(setAlert({
            message: `${e.response?.data || 'Ocurrio un error'}`,
            type: 'error'
          }));
        });
    }

    if (!details) {
      dispatch(setAlert({
        message: `${e.response?.data || 'Ocurrio un error'}`,
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
    const socket = io(DB_HOST)
    socket.on(`/sale`, (socket) => {
    })
    return () => {
      socket.disconnect();
    };
  }, [])

  const renderListEmpty = () => {
    if (offline) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No hay productos guardados localmente</Text>
        </View>
      )
    }

    if (state.status === 'initial-loading') {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.emptyStateText}>Cargando productos...</Text>
        </View>
      )
    }

    if (state.status === 'error') {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>{state.error || 'No se pudo cargar la lista'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refreshProducts}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>No hay productos para la consulta actual</Text>
      </View>
    )
  }

  const renderListFooter = () => {
    if (offline || state.status !== 'paginating') {
      return <View style={{ height: 20 }} />
    }

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#2563eb" />
      </View>
    )
  }

  if (isLoadingCreateSale || !hasPermissionCreateSale) {
    return null
  }

  return (
    <SafeAreaView style={styles.content}  >
      {/* Header - No modificar */}
      <View style={{ backgroundColor: '#2563eb', borderBottomLeftRadius: 18, borderBottomRightRadius: 18, paddingTop: 50, paddingBottom: 18, paddingHorizontal: 15, elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, marginRight: 10 }}>
              <Icon name="arrow-left" size={18} color="#fff" />
            </TouchableOpacity>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Nueva Venta</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.18)', borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 2 }}>
              <View style={[styles.onlineDot, { backgroundColor: offline ? '#C7253E' : '#4CAF50' }]} />
              <Text style={{ color: '#fff', fontSize: 13, marginLeft: 4 }}>{offline ? 'Offline' : 'Online'}</Text>
            </View>
          </View>
        </View>
        <View style={styles.searchBarContainer}>
          <Icon name="search" size={18} color="#7F8487" style={{ marginLeft: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar productos, categorías, marcas..."
            placeholderTextColor="#b0b0b0"
            {...search}
          />
          <TouchableOpacity onPress={() => setOpenFilter(true)} style={{ marginRight: 10 }}>
            <Icon name="filter" size={18} color="#7F8487" />
          </TouchableOpacity>
        </View>
      </View>

      {/* <Search placeholder={'Buscar producto'} searchInput={search} handleOpenFilter={() => { !offline && setOpenFilter(true) }} />
      <Text style={{ fontSize: 18, fontFamily: 'Cairo-Regular', color: `${offline ? '#C7253E' : '#799351'}`, paddingHorizontal: 15 }} >{offline ? 'Estas en modo sin conexion' : 'Estas en modo con conexion'}</Text> */}
      {
        !offline && state.pendingRealtimeCount > 0 && (
          <View style={styles.realtimeBanner}>
            <Text style={styles.realtimeBannerText}>
              Hay {state.pendingRealtimeCount} cambio{state.pendingRealtimeCount > 1 ? 's' : ''} pendiente{state.pendingRealtimeCount > 1 ? 's' : ''} en productos.
            </Text>
            <TouchableOpacity onPress={applyPendingChanges} style={styles.realtimeBannerButton}>
              <Text style={styles.realtimeBannerButtonText}>Actualizar</Text>
            </TouchableOpacity>
          </View>
        )
      }
      <FlatList
        style={{ height: '83%' }}
        data={offline ? filteredArray : state.items}
        renderItem={({ item }) => renderItem({ item, navigation, addSelectProduct })}
        keyExtractor={(item) => item._id}
        onEndReachedThreshold={0.5}
        onEndReached={offline ? undefined : loadNextPage}
        refreshing={!offline && state.status === 'refreshing'}
        onRefresh={refreshProducts}
        ListFooterComponent={renderListFooter}
        ListEmptyComponent={renderListEmpty}
      />
      <FilterProduct open={openFilter} onClose={() => setOpenFilter(false)} activeBrand={activeBrand._id} activeCategorie={activeCategorie._id} activeProvider={activeProvider._id}
        selectCategorie={(item) => setActiveCategorie(item)}
        selectBrand={(item) => setActiveBrand(item)}
        selectProvider={(item) => setActiveProvider(item)}
      />
      {
        selectProduct &&
        <AddProduct open={openAddProduct} onClose={() => setOpenAddProduct(false)} product={selectProduct} addCart={(item, cantidad, totalLV, precioUnitario) => addCart(item, cantidad, totalLV, precioUnitario)} />
      }
      {
        openAlertPost &&
        <AlertPostSale open={openAlertPost} onClose={() => navigation.navigate('Sale')} post={() => navigation.navigate('Sale')} print={() => generatePdf(cliente.value)} />
      }
      <ResumeBottomSheet onPress={() => setOpenBS(true)} totalCart={total} longCart={lineaVenta.length} />
      <MyBottomSheet open={openBS} onClose={() => setOpenBS(false)} fullScreen={true} >
        <SliderSale itemSlide={[
          <SelectClient cliente={cliente} setIdCliente={setIdCliente} idCliente={idCliente} />,
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
  searchBarContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
    color: '#252525',
    paddingHorizontal: 10,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginVertical: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#252525',
  },
  productSubtitle: {
    fontSize: 13,
    color: '#7F8487',
    marginTop: 2,
    marginBottom: 2,
  },
  productTagsRow: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 8,
  },
  productTag: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginRight: 8,
    borderWidth: 1,
  },
  productPrice: {
    fontSize: 20,
    color: '#2563eb',
    fontWeight: 'bold',
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  realtimeBanner: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  realtimeBannerText: {
    color: '#1d4ed8',
    fontSize: 13,
    flex: 1,
  },
  realtimeBannerButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  realtimeBannerButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  emptyStateText: {
    color: '#7F8487',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
