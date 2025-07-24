import { FlatList, Pressable, StyleSheet, Text, View, ScrollView } from 'react-native'
import React, { useEffect, useState, useContext } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hook';
import { getUser } from '../redux/userSlice';
import apiClient from '../utils/client';
import Table from '../components/Table';
import useLocalStorage from '../hooks/useLocalStorage';
import Button from '../components/Button';
import { clearLoading, setLoading } from '../redux/loadingSlice'
import { TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons'
import { OfflineContext } from '../context.js/contextOffline';
import { io } from 'socket.io-client';
import Constants from 'expo-constants';

const DB_HOST = Constants.expoConfig?.extra?.DB_HOST;


export default function DetailsSale({ route, navigation }) {

  const { id } = route.params;
  const user = useAppSelector(getUser)
  const { data: userStorage } = useLocalStorage([], 'user')
  const [details, setDetails] = useState(undefined)
  const [showAllProducts, setShowAllProducts] = useState(false)
  const dispatch = useAppDispatch();
  const { offline } = useContext(OfflineContext)

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
      // Verificar si la venta que escucha es la misma que tiene cargada
      if (socketData.data && socketData.data._id === id) {
        // Actualizar los detalles de la venta con los nuevos datos
        setDetails(socketData.data)
      }
    })
    return () => {
      socket.disconnect();
    };
  }, [id])



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
                <Text style={styles.infoValue}>{details.r.cliente}</Text>
                <Text style={styles.infoSubtext}>Cliente frecuente</Text>
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
              <Text style={styles.totalAmount}>${details.r.total}</Text>
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

          {/* Resumen financiero */}
          {/*  <View style={styles.financialSummaryCard}>
            <View style={styles.productsHeader}>
              <View style={styles.productsTitleContainer}>
                <View style={[styles.iconContainer, { backgroundColor: '#E0FFED' }]}>
                  <Icon name="file-text" size={16} color="#16a34a" />
                </View>
                <Text style={styles.productsTitle}>Resumen Financiero</Text>
              </View>
            </View>

            <View style={styles.divider} />

            
          </View> */}

          {/* Botones de acción */}
          {/*  <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={() => generatePdf(details.r._id)} >
            <Icon name="printer" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Imprimir</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#65a30d' }]} onPress={() => downloadAndSharePDF(details)}>
            <Icon name="file-text" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Generar PDF</Text>
          </TouchableOpacity>
        </View> */}

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
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 15,
    flex: 0.48,
    elevation: 1,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 10,
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