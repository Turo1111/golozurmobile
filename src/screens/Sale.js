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
import usePermissionCheck from '../hooks/usePermissionCheck';
import { TextInput, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import SaleItem from '../components/SaleItem';
import Constants from 'expo-constants';

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
  const { data: userStorage } = useLocalStorage([], 'user')
  const loading = useAppSelector(getLoading)
  const dispatch = useAppDispatch();
  const [data, setData] = useState([])
  const search = useInputValue('', '')
  const [dataSearch, setDataSearch] = useState([])
  const [error, setError] = useState(false)
  const [query, setQuery] = useState({ skip: 0, limit: 25 })

  const { hasPermission: hasPermissionReadSale, isLoading: isLoadingReadSale } = usePermissionCheck('read_sale', () => { })
  const { hasPermission: hasPermissionCreateSale, isLoading: isLoadingCreateSale } = usePermissionCheck('create_sale', () => { })
  const { hasPermission: hasPermissionUpdateSale, isLoading: isLoadingUpdateSale } = usePermissionCheck('update_sale', () => { })

  const { offline, sales } = useContext(OfflineContext)

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
      console.log("response", response.data.array[0])
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
    } catch (e) {
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
      console.log("input", input)
      const response = await apiClient.post(`/sale/search`, { input });
      setDataSearch(response.data);
    } catch (e) {
      console.log("error sale search", e);
      setError(true)
    } finally {
      dispatch(clearLoading())
    }
  }


  useEffect(() => {
  }, [navigation.isFocused()])

  useEffect(() => {
    let timeoutId;

    if (search.value !== '') {
      timeoutId = setTimeout(() => {
        getSaleSearch(search.value);
      }, 1000);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [search.value]);

  useEffect(() => {
    if (user && !offline) {
      getSale(query.skip, query.limit)
    }
  }, [query, offline])

  useEffect(() => {
    const socket = io(DB_HOST)
    socket.on(`sale`, (socket) => {
      setData((prevData) => {
        return [socket.data, ...prevData]
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

  if (isLoadingReadSale || !hasPermissionReadSale) {
    return null
  }

  const handleSalePress = (item) => {
    navigation.navigate('DetailsSale', {
      id: item._id,
      name: item.cliente,
    });
  };

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
              setQuery({ skip: 0, limit: 25 })
              getSale(0, 25)
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
            placeholder="Buscar ventas"
            placeholderTextColor="#b0b0b0"
            {...search}
          />
        </View>
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
      {
        !offline ?
          error ?
            <View style={{ height: '100%', width: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} >
              <Text style={{ fontSize: 22, fontFamily: 'Cairo-Regular', paddingHorizontal: 15, textAlign: 'center', marginBottom: 25 }} >"Ocurrio un error a traer los datos, compruebe su conexion si no es lento"</Text>
            </View>
            :
            <View style={{ flex: 1, paddingHorizontal: 15, paddingTop: 10 }}>
              <FlatList
                style={{ flex: 1 }}
                data={search.value !== '' ? dataSearch : data}
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
                  if (!loading.open) {
                    if (search) {
                      if (search.value === '') {
                        dispatch(setLoading({
                          message: `Cargando nuevas ventas`
                        }))
                        setQuery({ skip: query.skip + 15, limit: query.limit })
                      }
                    }
                  }
                }}
              />
            </View> :
          <View style={{ flex: 1, paddingHorizontal: 15, paddingTop: 10 }}>
            <Text style={styles.offlineMessage}>Estas en modo sin conexión</Text>
            <FlatList
              style={{ flex: 1 }}
              data={[...sales].reverse()}
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
  }
})

