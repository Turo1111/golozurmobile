import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { clearUser, getUser } from '../redux/userSlice';
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
import usePermissionCheck from '../hooks/usePermissionCheck';
import { TextInput, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import SaleItem from '../components/SaleItem';
import Constants from 'expo-constants';
import { subscribeToStorage } from '../hooks/useLocalStorage';
import { useFocusEffect } from '@react-navigation/native';
import { decode as base64Decode } from 'base-64'
import ListModeSwitch from '../components/ListModeSwitch';

const decodeJWT = (token) => {
  try {
    // Dividir el token en sus partes
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid token format')
    }

    // Decodificar el payload (segunda parte)
    const payload = parts[1]
    const decodedPayload = base64Decode(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decodedPayload)
  } catch (error) {
    console.error('Error decoding JWT:', error)
    throw error
  }
}

const DB_HOST = Constants.expoConfig?.extra?.DB_HOST;

const HEADER_BLUE = '#2563eb';

const arrayBufferToBase64 = (buffer) => {
  return Buffer.from(buffer).toString('base64');
};

// Helper function to get initials from name
const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

export default function Sale({ navigation }) {

  const user = useAppSelector(getUser)
  const { data: userStorage, clearData } = useLocalStorage([], 'user')
  const loading = useAppSelector(getLoading)
  const dispatch = useAppDispatch();
  const [data, setData] = useState([])
  const search = useInputValue('', '')
  const [dataSearch, setDataSearch] = useState([])
  const [error, setError] = useState(false)
  const [query, setQuery] = useState({ skip: 0, limit: 25 })
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [limitSales, setLimitSales] = useState(0)
  const [showLocal, setShowLocal] = useState(false)

  const { hasPermission: hasPermissionReadSale, isLoading: isLoadingReadSale } = usePermissionCheck('read_sale', () => { })
  const { hasPermission: hasPermissionCreateSale, isLoading: isLoadingCreateSale } = usePermissionCheck('create_sale', () => { })
  const { hasPermission: hasPermissionUpdateSale, isLoading: isLoadingUpdateSale } = usePermissionCheck('update_sale', () => { })

  const [offline, setOffline] = useState(false)

  const { data: saleStorage, clearData: clearSaleStorage } = useLocalStorage([], 'saleStorage')

  const [sales, setSales] = useState([]);

  const reloadLocalSales = useCallback(async () => {
    try {
      const json = await AsyncStorage.getItem('saleStorage');
      if (json) {
        setSales(JSON.parse(json));
      } else {
        setSales([]);
      }
    } catch (e) {
      setSales([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reloadLocalSales();
    }, [reloadLocalSales])
  );

  const logOut = async () => {
    try {
      await clearData();
      await dispatch(clearUser());
    } catch (error) {
      console.error(error);
    }
    navigation.navigate('Login');
  };

  const getUsers = async () => {
    try {
      const response = await apiClient.get('/user/get/all');
      setUsers(response.data);
    } catch (e) {
      if (e.response.data === 'USUARIO_NO_ACTIVO') {
        logOut()
      }
      console.log("error getUsers", e)
    }
  }

  const getSale = async (skip, limit, filterUser = null) => {
    dispatch(setLoading({
      message: `Actualizando ventas`
    }))
    try {
      const response = await apiClient.post(`/sale/skip`, { skip, limit, filterUser },
        {
          headers: {
            Authorization: `Bearer ${user.token || userStorage.token}`
          },
        });
      if (filterUser !== null) {
        setData(response.data.array)
        setLimitSales(response.data.longitud)
        console.log("response.data.longitud", response.data.longitud)
        return
      } else {
        console.log("response.data.array", response.data.array.length)
        console.log("response.data.longitud", response.data.longitud)
        setData((prevData) => {
          if (prevData) {
            if (prevData.length === 0) {
              return response.data.array
            }
            const newData = response.data.array.filter((element) => {
              return prevData.findIndex((item) => item._id === element._id) === -1;
            });
            return [...prevData, ...newData];
          }
          return []
        })
        setLimitSales(response.data.longitud)
      }
    } catch (e) {
      setOffline(true)
      if (e.response.data === 'USUARIO_NO_ACTIVO') {
        logOut()
      }
      console.log("error getSale", e)
      setError(true)
    } finally {
      dispatch(clearLoading());
    }
  }

  const getSaleSearch = async (input) => {
    dispatch(setLoading({
      message: `Actualizando ventas`
    }))
    try {
      const response = await apiClient.post(`/sale/search`, { input });
      setDataSearch(response.data);
    } catch (e) {
      setOffline(true)
      if (e.response.data === 'USUARIO_NO_ACTIVO') {
        logOut()
      }
      console.log("error sale search", e);
      setError(true)
    } finally {
      dispatch(clearLoading())
    }
  }

  const clearUserFilter = () => {
    setSelectedUser(null);
    setQuery({ skip: 0, limit: 25 });

    // Ejecutar búsqueda sin filtro de usuario
    if (search.value !== '') {
      getSaleSearch(search.value);
    } else {
      getSale(0, 25);
    }
  }

  useEffect(() => {
  }, [navigation.isFocused()])

  useEffect(() => {
    let timeoutId;

    if (search.value !== '' && !showLocal) {
      timeoutId = setTimeout(() => {
        getSaleSearch(search.value);
      }, 1000);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [search.value, showLocal]);

  useEffect(() => {
    if (user && !offline && !showLocal) {
      getUsers();
    }
  }, [user, offline, showLocal]);

  useEffect(() => {
    console.log("query", query)
    if (!showLocal) {
      getSale(query.skip, query.limit, selectedUser?._id)
    }
  }, [query, selectedUser, showLocal])

  useEffect(() => {
    const socket = io(DB_HOST)
    socket.on(`sale`, async (socket) => {
      const tokenDecoded = decodeJWT(userStorage.token)
      if (!socket.data._id) {
        await setData([])
        await getSale(query.skip, query.limit, selectedUser?._id)
        return
      }
      setData((prevData) => {
        if (tokenDecoded.id === socket.data.user || userStorage.nameRole === 'admin') {
          return [socket.data, ...prevData]
        }
        return prevData
      })
    })
    return () => {
      socket.disconnect();
    };
  }, [data])

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
    let details = undefined;
    if (offline || showLocal) {
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
        dispatch(setAlert({
          message: 'Hubo un error al obtener la venta 1',
          type: 'error'
        }));
        dispatch(clearLoading());
      }
    } else {
      dispatch(setLoading({
        message: `Obteniendo venta`
      }))
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
          dispatch(clearLoading());
        })
        .catch(e => {
          dispatch(setAlert({
            message: 'Hubo un error al obtener la venta 1',
            type: 'error'
          }));
          dispatch(clearLoading());
        });
    }

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

      const itemsText = items.map(item =>
        `
          <div class="it">
            <p class="it">${(item.descripcion).toUpperCase()}</p>
            <div class="itemList">
              <div class="flex">
                <p class="it">${item.cantidad}x</p>
                <p class="it">$${((item.total / item.cantidad) || item.precio || item.precioUnitario || 'error').toString().toLocaleString('es-ES')}</p>
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

  const handleSalePress = (item) => {
    navigation.navigate('DetailsSale', {
      id: item._id,
      name: item.cliente,
    });
  };

  const filteredLocalSales = useMemo(() => {
    const term = (search.value || '').toString().toLowerCase();
    if (!term) return [...sales].reverse();
    try {
      return [...sales]
        .filter((s) => (s?.cliente || '').toString().toLowerCase().includes(term))
        .reverse();
    } catch {
      return [...sales].reverse();
    }
  }, [sales, search.value]);

  if (isLoadingReadSale || !hasPermissionReadSale) {
    return null
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f6f8fa' }}>
      <View style={styles.headerContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, marginRight: 10 }}>
              <Icon name="arrow-left" size={18} color="#fff" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Ventas</Text>
              <Text style={styles.headerSubtitle}>Gestión de ventas</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.onlineBadge}>
              <View style={[styles.onlineDot, { backgroundColor: offline ? '#C7253E' : '#4CAF50' }]} />
              <Text style={{ color: '#fff', fontSize: 13, marginLeft: 4 }}>{offline ? 'Offline' : 'Online'}</Text>
            </View>
            <TouchableOpacity onPress={() => {
              if (showLocal) {
                reloadLocalSales();
              } else {
                setQuery({ skip: 0, limit: 25 })
                getSale(0, 25)
              }
            }} style={{ marginLeft: 8, padding: 4, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10 }}>
              <Icon name="refresh-cw" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        {/* SEARCH BAR */}
        <View style={styles.searchBarContainer}>
          <Icon name="search" size={18} color="#7F8487" style={{ marginLeft: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={showLocal ? "Buscar ventas locales" : (selectedUser ? `Filtrando por: ${selectedUser.nickname}` : "Buscar ventas")}
            placeholderTextColor="#b0b0b0"
            {...search}
          />
          {
            !showLocal && userStorage.nameRole === 'admin' &&
            <TouchableOpacity
              onPress={() => setShowUserDropdown(!showUserDropdown)}
              style={styles.dropdownButton}
            >
              <Icon name={showUserDropdown ? "chevron-up" : "chevron-down"} size={18} color="#7F8487" />
            </TouchableOpacity>
          }
        </View>

        {/* USER DROPDOWN */}
        {showUserDropdown && (
          <View style={styles.dropdownContainer}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Filtrar por usuario</Text>
              {selectedUser && (
                <TouchableOpacity onPress={clearUserFilter} style={styles.clearFilterButton}>
                  <Text style={styles.clearFilterText}>Limpiar</Text>
                </TouchableOpacity>
              )}
            </View>
            <FlatList
              data={users}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.userItem,
                    selectedUser?._id === item._id && styles.selectedUserItem
                  ]}
                  onPress={() => { setSelectedUser(item); setShowUserDropdown(false), console.log("item", item) }}
                >
                  <View style={styles.userInfo}>
                    <View style={styles.userInitials}>
                      <Text style={styles.userInitialsText}>
                        {getInitials(item.nickname)}
                      </Text>
                    </View>
                    <View style={styles.userDetails}>
                      <Text style={styles.userName}>{item.nickname}</Text>
                      {/* {item.role && (
                        <Text style={styles.userPhone}>{item.role}</Text>
                      )} */}
                    </View>
                  </View>
                  {selectedUser?._id === item._id && (
                    <Icon name="check" size={16} color="#2563eb" />
                  )}
                </TouchableOpacity>
              )}
              style={styles.userList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
        {/* BOTONES PRINCIPALES */}
        <View style={styles.headerButtonsRow}>
          {hasPermissionCreateSale && (
            <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('NewSale')}>
              <Icon name="plus" size={14} color="#fff" style={styles.headerButtonIcon} />
              <Text style={styles.headerButtonText}>Nueva Venta</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* SWITCH DE MODO DE LISTA */}
      <View style={styles.modeSwitchContainer}>
        <ListModeSwitch
          value={showLocal}
          onValueChange={async (v) => {
            setShowLocal(v);
            if (v) {
              await reloadLocalSales();
            }
          }}
          leftLabel="Servidor"
          rightLabel="Sin Sincronizar"
        />
      </View>
      {
        (!showLocal && !offline) ?
          error ?
            <View style={{ height: '100%', width: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} >
              <Text style={{ fontSize: 22, fontFamily: 'Cairo-Regular', paddingHorizontal: 15, textAlign: 'center', marginBottom: 25 }} >"Ocurrio un error a traer los datos, compruebe su conexion si no es lento"</Text>
            </View>
            :
            <View style={{ flex: 1, paddingHorizontal: 15, paddingTop: 10 }}>
              <FlatList
                style={{ flex: 1 }}
                data={(search.value !== '') ? dataSearch : data}
                renderItem={({ item }) => (
                  <SaleItem
                    item={item}
                    isOffline={false}
                    hasPermissionUpdateSale={hasPermissionUpdateSale}
                    onPress={() => handleSalePress(item)}
                    onDownloadPDF={() => downloadAndSharePDF(item)}
                    onGeneratePDF={() => generatePdf(item._id)}
                  />
                )}
                keyExtractor={(item) => item._id}
                onEndReached={() => {
                  // Solo cargar más datos si:
                  // 1. No estamos ya cargando
                  // 2. No hay búsqueda activa
                  // 3. Aún hay más datos para cargar
                  console.log("limitSales onEndReached", limitSales)
                  if (25 >= limitSales) {
                    return
                  }
                  console.log("pase por aqui")
                  if (!loading.open && search.value === '' && query.skip + query.limit < limitSales) {
                    dispatch(setLoading({
                      message: `Cargando nuevas ventas`
                    }))
                    if (query.skip + query.limit >= limitSales) {
                      const newValue = limitSales - query.limit
                      setQuery({ skip: query.skip + newValue, limit: query.limit })
                      return
                    }
                    setQuery({ skip: query.skip + query.limit, limit: query.limit })
                  }
                }}
              />
            </View> :
          <View style={{ flex: 1, paddingHorizontal: 15, paddingTop: 10 }}>
            <Text style={styles.offlineMessage}>{showLocal ? 'Listando ventas locales' : 'Estas en modo sin conexión'}</Text>
            <FlatList
              style={{ flex: 1 }}
              data={filteredLocalSales}
              renderItem={({ item }) => (
                <SaleItem
                  item={item}
                  isOffline={true}
                  hasPermissionUpdateSale={hasPermissionUpdateSale}
                  onGeneratePDF={() => generatePdf(item.cliente)}
                />
              )}
              keyExtractor={(_, index) => `offline-sale-${index}`}
              ListEmptyComponent={<Text style={{ fontSize: 18, fontFamily: 'Cairo-Regular', paddingHorizontal: 15, textAlign: 'center', marginTop: '15%' }} >SIN VENTAS EN MODO OFFLINE</Text>}
            />
          </View>
      }
    </View>
  )
}

const styles = StyleSheet.create({
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
    justifyContent: 'center',
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
  },
  modeSwitchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownButton: {
    padding: 10,
    marginRight: 5,
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginTop: 5,
    marginBottom: 10,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#252525',
  },
  clearFilterButton: {
    backgroundColor: '#ff4757',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearFilterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  userList: {
    maxHeight: 250,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  selectedUserItem: {
    backgroundColor: '#f0f8ff',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userInitials: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInitialsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#252525',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 13,
    color: '#6b7280',
  },
})

