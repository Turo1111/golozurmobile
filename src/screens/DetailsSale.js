import { FlatList, Pressable, StyleSheet, Text, View, ScrollView } from 'react-native'
import React, { useEffect, useState, useContext } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hook';
import { getUser } from '../redux/userSlice';
import apiClient from '../utils/client';
import useLocalStorage from '../hooks/useLocalStorage';
import { clearLoading, setLoading } from '../redux/loadingSlice'
import { TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons'
import { OfflineContext } from '../context.js/contextOffline';
import { io } from 'socket.io-client';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { setAlert } from '../redux/alertSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import usePermissionCheck from '../hooks/usePermissionCheck';
import { Buffer } from 'buffer';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import AlertDeleteSale from '../components/AlertDeleteSale';

const DB_HOST = Constants.expoConfig?.extra?.DB_HOST;

const arrayBufferToBase64 = (buffer) => {
  return Buffer.from(buffer).toString('base64');
};


export default function DetailsSale({ route, navigation }) {

  const { id } = route.params;
  const user = useAppSelector(getUser)
  const { data: userStorage } = useLocalStorage([], 'user')
  const [details, setDetails] = useState(undefined)
  const [showAllProducts, setShowAllProducts] = useState(false)
  const dispatch = useAppDispatch();
  const { offline } = useContext(OfflineContext)
  const { hasPermission: hasPermissionEditSale, isLoading: isLoadingEditSale } = usePermissionCheck('update_sale', () => { })
  const [openAlertDelete, setOpenAlertDelete] = useState(false)

  const getDetails = () => {
    dispatch(setLoading({
      message: `Cargando datos`
    }))
    apiClient.get(`/sale/${id}`,
      {
        headers: {
          Authorization: `Bearer ${user.token || userStorage.token}`
        },
      })
      .then(response => {
        setDetails(response.data)
        dispatch(clearLoading())
      })
      .catch(e => { console.log("error", e); dispatch(clearLoading()) })
  }

  useEffect(() => {
    getDetails()
  }, [user, userStorage])

  useEffect(() => {
    const socket = io(DB_HOST)
    socket.on(`sale`, (socketData) => {
      console.log(socketData, 'socketdata details')
      // Verificar si la venta que escucha es la misma que tiene cargada

      getDetails()

    })
    return () => {
      socket.disconnect();
    };
  }, [id, details])



  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');

    // Obtener el nombre del mes en español
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const month = months[date.getMonth()];

    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return {
      date: `${day} ${month} ${year}`,
      time: `${hours}:${minutes} hrs`
    };
  };

  const downloadAndSharePDF = async (item) => {
    const fileName = `venta-${item.r.cliente}.pdf`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    dispatch(setLoading({
      message: `Actualizando ventas`
    }))
    try {
      // Descargar el archivo como ArrayBuffer
      const response = await apiClient.get(`/sale/print/${item.r._id}`, { responseType: 'arraybuffer' });
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

  const confirmDeleteSale = async () => {
    setOpenAlertDelete(false)
    dispatch(setLoading({
      message: 'Dando de baja venta'
    }))
    try {
      await apiClient.delete(`/sale/${id}`, {
        headers: {
          Authorization: `Bearer ${user.token || userStorage.token}`
        },
      })
      dispatch(clearLoading())
      dispatch(setAlert({ message: 'Venta dada de baja correctamente', type: 'success' }))
      navigation.goBack()
    } catch (e) {
      console.log(e)
      dispatch(clearLoading())
      dispatch(setAlert({ message: `${e.response?.data || 'No se pudo dar de baja la venta'}`, type: 'error' }))
    }
  }

  const generatePdf = async (cliente) => {
    console.log(cliente, 'cliente')
    let detailsSalePdf = undefined;
    if (offline) {
      dispatch(setLoading({
        message: `Obteniendo venta`
      }))
      try {
        const jsonValue = await AsyncStorage.getItem('saleStorage');
        if (jsonValue !== null) {
          const value = JSON.parse(jsonValue);
          detailsSalePdf = await value.find(elem => elem.cliente === cliente);
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
          detailsSalePdf = {
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

    if (!detailsSalePdf) {
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

    const itemsChunks = chunkArray(detailsSalePdf.itemsSale, 15);

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
                <p>Fecha: ${detailsSalePdf.createdAt.split("T")[0]}</p>
                <p>Cliente: ${detailsSalePdf.cliente}</p>
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
                  <p>Total Neto $ ${(detailsSalePdf.total).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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

  const ProductItem = ({ item }) => {
    // Determinar la categoría - aquí estoy asumiendo que puedes extraerla de la descripción o datos
    const category = item.categoria || 'Sin categoria'; // Fallback a Bebidas si no hay categoría

    const precioUnitario = item.total / item.cantidad;

    return (
      <View style={styles.productItem}>
        <View style={[styles.productIcon, { backgroundColor: '#E6F0FF' }]}>
          <Icon name={'box'} size={22} color="#555" />
        </View>

        <View style={styles.productDetails}>
          <Text style={styles.productName}>{item.descripcion}</Text>
          <Text style={styles.productCategory}>{category}</Text>
        </View>

        <View style={styles.productPricing}>
          <Text style={styles.productQuantity}>{item.cantidad}x ${precioUnitario.toFixed(2)}</Text>
          <Text style={styles.productTotal}>${item.total.toFixed(2)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F6F8FA' }}>
      {/* Header - No modificar */}
      <View style={{ backgroundColor: '#2563eb', borderBottomLeftRadius: 18, borderBottomRightRadius: 18, paddingTop: 50, paddingBottom: 18, paddingHorizontal: 15, elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, marginRight: 10 }}>
              <Icon name="arrow-left" size={18} color="#fff" />
            </TouchableOpacity>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Detalles de la Venta</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.18)', borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 2 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50' }} />
              <Text style={{ color: '#fff', fontSize: 13, marginLeft: 4 }}>Online</Text>
            </View>
          </View>
        </View>
      </View>

      {details && (
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Tarjeta de Información Cliente y Fecha */}
          <View style={styles.infoCard}>
            <View style={[styles.infoRow]}>
              <View style={styles.infoColumn}>
                <View style={styles.iconLabelContainer}>
                  <View style={[styles.iconContainer, { backgroundColor: '#E6F0FF' }]}>
                    <Ionicons name="person" size={16} color="#3b82f6" />
                  </View>
                  <Text style={styles.infoLabel}>Cliente</Text>
                </View>
                <Text style={[styles.infoValue, { color: details.r.estado === 'Cancelado' ? '#FF6B6B' : '#252525' }]}>{details.r.cliente}</Text>
                <Text style={styles.infoSubtext}>Cliente frecuente</Text>
                <Text style={[styles.infoSubtext, { color: details.r.estado === 'Cancelado' ? '#FF6B6B' : '#252525' }]}>{details.r.estado}</Text>
              </View>

              <View style={styles.infoColumn}>
                <View style={styles.iconLabelContainer}>
                  <View style={[styles.iconContainer, { backgroundColor: '#FFF0E0' }]}>
                    <Ionicons name="calendar" size={16} color="#f97316" />
                  </View>
                  <Text style={styles.infoLabel}>Fecha</Text>
                </View>
                <Text style={[styles.infoValue, { fontSize: 16 }]}>{formatDate(details.r.createdAt).date}</Text>
                <Text style={[styles.infoSubtext, { textAlign: 'right' }]}>{formatDate(details.r.createdAt).time}</Text>
              </View>
            </View>



            <View style={styles.divider} />

            <View style={[styles.financialItem, styles.totalItem]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={[styles.totalAmount, { color: details.r.estado === 'Cancelado' ? '#FF6B6B' : '#16a34a' }]}>${details.r.total}</Text>
            </View>

            {/* <View style={styles.infoRow}>
              <View style={styles.infoColumn}>
                <View style={styles.iconLabelContainer}>
                  <View style={[styles.iconContainer, { backgroundColor: '#E0FFED' }]}>
                    <Icon name="credit-card" size={16} color="#16a34a" />
                  </View>
                  <Text style={styles.infoLabel}>Método de pago</Text>
                </View>
              </View>
              <Text style={styles.paymentValue}>Efectivo</Text>
            </View>  */}
          </View>
          {/* Botones de acción */}
          {
            hasPermissionEditSale && (
              <View style={styles.infoCard}>
                <View style={[styles.infoRow]}>
                  <View style={styles.infoColumn}>
                    <View style={[styles.iconLabelContainer, { marginBottom: 0 }]}>
                      <View style={[styles.iconContainer, { backgroundColor: '#E6F0FF' }]}>
                        <Ionicons name="ellipsis-vertical" size={16} color="#3b82f6" />
                      </View>
                      <Text style={styles.infoLabel}>Acciones</Text>
                    </View>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', marginBottom: 15 }}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#FFF0E0' }]} // Naranja claro para editar
                    onPress={() => navigation.navigate('EditSale', { id })}
                  >
                    <Icon name="edit-2" size={22} color="#f97316" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#E0FFED' }]} // Verde claro para PDF
                    onPress={() => downloadAndSharePDF(details)}
                  >
                    <Icon name="file-text" size={22} color="#16a34a" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#E6F0FF' }]} // Azul claro para imprimir
                    onPress={() => generatePdf(details.r._id)}
                  >
                    <Icon name="printer" size={22} color="#3b82f6" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#FFE6E6' }]} onPress={() => setOpenAlertDelete(true)}>
                    <FontAwesome name='trash' size={22} color='#FF6B6B' />
                  </TouchableOpacity>
                </View>
              </View>
            )
          }

          {openAlertDelete && (
            <AlertDeleteSale
              open={openAlertDelete}
              onClose={() => setOpenAlertDelete(false)}
              confirm={confirmDeleteSale}
              cliente={details?.r?.cliente}
            />
          )}

          {/* Productos */}

          {/* Productos */}
          <View style={styles.productsCard}>
            <View style={styles.productsHeader}>
              <View style={styles.productsTitleContainer}>
                <View style={[styles.iconContainer, { backgroundColor: '#E6F0FF' }]}>
                  <Icon name="shopping-bag" size={16} color="#3b82f6" />
                </View>
                <Text style={styles.productsTitle}>Productos</Text>
              </View>
            </View>

            {details?.itemsSale?.map((item, index) => (
              <ProductItem key={index.toString()} item={item} />
            ))}
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2.5,
    elevation: 2,
  },
  actionButton: {
    padding: 8,
    borderRadius: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
  },
  infoColumn: {
    /* flex: 1, */
  },
  iconLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 2,
  },
  infoSubtext: {
    fontSize: 13,
    color: '#94a3b8',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 15,
  },
  paymentValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'right',
    flex: 1,
  },
  productsCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2.5,
    elevation: 2,
  },
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  productsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginLeft: 8,
    marginRight: 8,
  },
  productsCount: {
    fontSize: 12,
    color: '#94a3b8',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    color: '#3b82f6',
    fontSize: 14,
    marginRight: 4,
  },
  productsList: {
    marginTop: 5,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  productIcon: {
    width: 45,
    height: 45,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 13,
    color: '#94a3b8',
  },
  productPricing: {
    alignItems: 'flex-end',
  },
  productQuantity: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  productTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  financialSummaryCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2.5,
    elevation: 2,
  },
  financialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  financialLabel: {
    fontSize: 15,
    color: '#64748b',
  },
  financialValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  discountValue: {
    color: '#dc2626',
  },
  totalItem: {
    paddingVertical: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#16a34a',
  },
  shareButton: {
    backgroundColor: '#f97316',
  },
  generatePdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#65a30d',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    elevation: 1,
    marginBottom: 15,
  },
});
