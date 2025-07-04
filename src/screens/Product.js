import { FlatList, Pressable, StyleSheet, Text, View, TouchableOpacity, TextInput } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import apiClient from '../utils/client'
import { getUser } from '../redux/userSlice';
import { useAppDispatch, useAppSelector } from '../redux/hook';
import { clearLoading, getLoading, setLoading } from '../redux/loadingSlice';
import Search from '../components/Search';
import Button from '../components/Button';
import { useInputValue } from '../hooks/useInputValue'
import { io } from 'socket.io-client';
import UpdatePrice from '../components/UpdatePrice';
import FilterProduct from '../components/FilterProduct';
import useLocalStorage from '../hooks/useLocalStorage';
import useInternetStatus from '../hooks/useInternetStatus';
import { OfflineContext } from '../context.js/contextOffline';
import useFilteredArray from '../hooks/useFilteredArray';
import PrintProduct from '../components/PrintProduct';
import { setAlert } from '../redux/alertSlice';
import usePermissionCheck from '../hooks/usePermissionCheck';
import Icon from 'react-native-vector-icons/Feather';
import Constants from 'expo-constants';

const DB_HOST = Constants.expoConfig?.extra?.DB_HOST;

const renderItem = ({ item, navigation, offline }) => {

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
    <Pressable style={styles.productCard} onPress={() => {
      if (offline) return;
      navigation.navigate('DetailsProduct', {
        id: item._id,
        name: item.descripcion,
      });
    }}>
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
const BUTTON_BG = '#2563eb';
const BUTTON_TEXT = '#fff';

export default function Product({ navigation }) {

  const user = useAppSelector(getUser)
  const { data: userStorage } = useLocalStorage([], 'user')
  const loading = useAppSelector(getLoading)
  const dispatch = useAppDispatch();
  const [data, setData] = useState([])
  const [dataSearch, setDataSearch] = useState([])
  const [query, setQuery] = useState({ skip: 0, limit: 15 })
  const [openUpdate, setOpenUpdate] = useState(false)
  const [activeCategorie, setActiveCategorie] = useState({ _id: 1, descripcion: 'Todas' })
  const [activeBrand, setActiveBrand] = useState({ _id: 1, descripcion: 'Todas' })
  const [activeProvider, setActiveProvider] = useState({ _id: 1, descripcion: 'Todas' })
  const [openFilter, setOpenFilter] = useState(false)
  const isConnected = useInternetStatus();
  const { data: productLocalStorage } = useLocalStorage([], 'productStorage')
  const fechaHoy = new Date()
  const [openPrint, setOpenPrint] = useState(false)

  const { hasPermission: hasPermissionCreateProduct, isLoading: isLoadingCreateProduct } = usePermissionCheck('create_product', () => { })
  const { hasPermission: hasPermissionUpdateProduct, isLoading: isLoadingUpdateProduct } = usePermissionCheck('update_product', () => { })
  const { hasPermission: hasPermissionReadProduct, isLoading: isLoadingReadProduct } = usePermissionCheck('read_product', () => { })

  //const { data: offlineStorage, saveData: setOfflineStorage } = useLocalStorage(true, 'offlineStorage')

  const search = useInputValue('', '')

  const filteredArray = useFilteredArray(productLocalStorage, search.value);

  const { offline } = useContext(OfflineContext)

  const getProduct = (skip, limit) => {
    dispatch(setLoading({
      message: `Actualizando productos`
    }))
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
      .catch(e => {
        console.log("error getProduct", e); dispatch(clearLoading())
        dispatch(setAlert({
          message: `${e.response?.data || 'Ocurrio un error'}`,
          type: 'error'
        }))
      })
  }

  const getProductSearch = (input, categorie, brand, provider) => {

    apiClient.post(`/product/search`, { input, categoria: categorie, marca: brand, proveedor: provider },
      {
        headers: {
          Authorization: `Bearer ${user.token || userStorage.token}` // Agregar el token en el encabezado como "Bearer {token}"
        },
      }
    )
      .then(response => {
        setDataSearch(response.data)
      })
      .catch(e => {
        console.log("error", e); dispatch(clearLoading())
        dispatch(setAlert({
          message: `${e.response?.data || 'Ocurrio un error'}`,
          type: 'error'
        }))
      })
  }

  useEffect(() => {
    if (!offline) {
      getProduct(query.skip, query.limit)
    }
  }, [query, offline])

  useEffect(() => {
    if (search && !offline) {
      getProductSearch(search.value, activeCategorie._id, activeBrand._id, activeProvider._id)
    }
  }, [search.value, activeBrand, activeCategorie, activeProvider])

  useEffect(() => {
    const socket = io(DB_HOST)
    socket.on(`product`, (socket) => {
      refreshProducts()
      setData((prevData) => {
        const exist = prevData.find((elem) => elem._id === socket.data._id)
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
  }, [data])

  const refreshProducts = () => {
    search.clearValue()
    if (!offline) {
      getProduct(query.skip, query.limit)
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshProducts()
    });

    return unsubscribe
  }, [navigation]);

  if (isLoadingReadProduct || !hasPermissionReadProduct) {
    return null
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f6f8fa' }}>
      {/* HEADER NUEVO */}
      <View style={styles.headerContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, marginRight: 10 }}>
              <Icon name="arrow-left" size={18} color="#fff" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Productos</Text>
              <Text style={styles.headerSubtitle}>Gestión de inventario</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.onlineBadge}>
              <View style={[styles.onlineDot, { backgroundColor: offline ? '#C7253E' : '#4CAF50' }]} />
              <Text style={{ color: '#fff', fontSize: 13, marginLeft: 4 }}>{offline ? 'Offline' : 'Online'}</Text>
            </View>
            <TouchableOpacity onPress={refreshProducts} style={{ marginLeft: 8, padding: 4, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10 }}>
              <Icon name="refresh-cw" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        {/* SEARCH BAR */}
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
        {/* BOTONES PRINCIPALES */}
        {
          !offline && (
            <View style={styles.headerButtonsRow}>
              {hasPermissionCreateProduct && (
                <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('NewProduct')}>
                  <Icon name="plus" size={14} color="#fff" style={styles.headerButtonIcon} />
                  <Text style={styles.headerButtonText}>Nuevo</Text>
                </TouchableOpacity>
              )}
              {hasPermissionUpdateProduct && (
                <TouchableOpacity style={styles.headerButton} onPress={() => setOpenUpdate(true)}>
                  <Icon name="edit-2" size={14} color="#fff" style={styles.headerButtonIcon} />
                  <Text style={styles.headerButtonText}>Actualizar</Text>
                </TouchableOpacity>
              )}
              {hasPermissionReadProduct && (
                <TouchableOpacity style={styles.headerButton} onPress={() => setOpenPrint(true)}>
                  <Icon name="printer" size={14} color="#fff" style={styles.headerButtonIcon} />
                  <Text style={styles.headerButtonText}>Imprimir</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      </View>
      {
        !offline ?
          <View>
            <FlatList
              style={{ height: '83%' }}
              data={search.value !== '' || activeBrand._id !== 1 || activeCategorie._id !== 1 || activeProvider._id !== 1 ?
                dataSearch :
                data
              }
              renderItem={({ item }) => renderItem({ item, navigation, offline })}
              keyExtractor={(item) => item._id}
              onEndReached={() => {
                if (!loading.open) {
                  if (search) {
                    if (search.value === '') {
                      dispatch(setLoading({
                        message: `Cargando nuevos productos`
                      }))
                      setQuery({ skip: query.skip + 15, limit: query.limit })
                    }
                  }
                }
              }}
            />
            <UpdatePrice open={openUpdate} onClose={() => setOpenUpdate(false)} updateQuery={refreshProducts} />
            <FilterProduct open={openFilter} onClose={() => setOpenFilter(false)} activeBrand={activeBrand._id} activeCategorie={activeCategorie._id} activeProvider={activeProvider._id}
              selectCategorie={(item) => setActiveCategorie(prevItem => prevItem._id === item._id ? { _id: 1, descripcion: 'Todas' } : item)}
              selectBrand={(item) => setActiveBrand(item)}
              selectProvider={(item) => setActiveProvider(item)}
            />
            <PrintProduct
              open={openPrint} onClose={() => setOpenPrint(false)}
            />
          </View>
          :
          <View>
            <Text style={styles.offlineMessage}>Estas en modo sin conexión</Text>
            <FlatList
              style={{ height: '83%' }}
              data={filteredArray}
              renderItem={({ item }) => renderItem({ item, navigation, offline })}
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
  headerContainer: {
    backgroundColor: HEADER_BLUE,
    paddingTop: 40,
    paddingBottom: 18,
    paddingHorizontal: 15,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#e0e7ff',
    fontSize: 13,
  },
  onlineBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
  headerButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  headerButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 4,
    marginTop: 0,
    marginBottom: 0,
    minWidth: 110,
    justifyContent: 'center',
  },
  headerButtonIcon: {
    marginRight: 8,
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
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
  offlineMessage: {
    fontSize: 14,
    color: '#C7253E',
    paddingHorizontal: 15,
    paddingVertical: 6,
    backgroundColor: '#ffeeee',
    borderRadius: 8,
    marginHorizontal: 10,
    marginVertical: 8,
    textAlign: 'center',
    fontWeight: '500',
  }
});