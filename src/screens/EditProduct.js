import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import Button from '../components/Button'
import { useFormik } from 'formik'
import InputSelectAdd from '../components/InputSelectAdd'
import apiClient from '../utils/client'
import { useAppDispatch, useAppSelector } from '../redux/hook'
import { getUser } from '../redux/userSlice'
import { clearLoading, getLoading, setLoading } from '../redux/loadingSlice'
import { setAlert } from '../redux/alertSlice'
import { io } from 'socket.io-client'
import useLocalStorage from '../hooks/useLocalStorage'
import { TouchableOpacity } from 'react-native'
import Icon from 'react-native-vector-icons/Feather'
import { OfflineContext } from '../context.js/contextOffline'
import Constants from 'expo-constants';

const DB_HOST = Constants.expoConfig?.extra?.DB_HOST;

const HEADER_BLUE = '#2563eb';

export default function EditProduct({ route, navigation }) {

  const { id, details } = route.params;
  const user = useAppSelector(getUser)
  const { data: userStorage } = useLocalStorage([], 'user')
  const loading = useAppSelector(getLoading)
  const dispatch = useAppDispatch();
  const { offline } = useContext(OfflineContext)

  const formik = useFormik({
    initialValues: initialValues(details),
    validateOnChange: false,
    onSubmit: (formValue) => {
      if (formValue.descripcion === '' || formValue.stock <= 0 || formValue.precioUnitario <= 0) {
        dispatch(setAlert({
          message: `Falta descripcion o stock o precio unitario `,
          type: 'warning'
        }))
        return
      }
      if (formValue.categoria === '' || formValue.proveedor === '' || formValue.marca === '') {
        dispatch(setAlert({
          message: `Falta categoria o proveedor o marca `,
          type: 'warning'
        }))
        return
      }
      dispatch(setLoading({
        message: `Cargando nuevos productos`
      }))
      apiClient.patch(`/product/${id}`, formValue,
        {
          headers: {
            Authorization: `Bearer ${user.token || userStorage.token}` // Agregar el token en el encabezado como "Bearer {token}"
          }
        })
        .then(async (r) => {
          dispatch(setAlert({
            message: `Producto modificado correctamente`,
            type: 'success'
          }))
          dispatch(clearLoading())
          navigation.navigate('Product')
        })
        .catch(e => {
          console.log('error', e);
          dispatch(clearLoading())
          dispatch(setAlert({
            message: `${e.response?.data || 'Ocurrio un error'}`,
            type: 'error'
          }))
        })
    }
  })

  useEffect(() => {
    const socket = io(DB_HOST)
    socket.on(`/product`, (socket) => {
      setDetails((prevData) => {
        if (socket.data._id === id) {
          return socket.data
        }
        return prevData
      })
    })
    return () => {
      socket.disconnect();
    };
  }, [id])

  return (
    <View style={{ width: '100%', height: '100%' }}>
      {/* HEADER NUEVO */}
      <View style={styles.headerContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, marginRight: 10 }}>
              <Icon name="arrow-left" size={18} color="#fff" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Editar Producto</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.onlineBadge}>
              <View style={[styles.onlineDot, { backgroundColor: offline ? '#C7253E' : '#4CAF50' }]} />
              <Text style={{ color: '#fff', fontSize: 13, marginLeft: 4 }}>{offline ? 'Offline' : 'Online'}</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* INFORMACIÓN BÁSICA */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#EBF5FF' }]}>
              <Icon name="info" size={18} color="#2563eb" />
            </View>
            <Text style={styles.sectionTitle}>Información Básica</Text>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Descripción del Producto *</Text>
            <TextInput
              placeholder="Ej: Coca Cola 350ml"
              style={styles.input}
              value={formik.values.descripcion}
              onChangeText={(text) => formik.setFieldValue('descripcion', text)}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Stock Inicial *</Text>
            <TextInput
              placeholder="0"
              style={styles.input}
              value={formik.values.stock}
              keyboardType="numeric"
              onChangeText={(text) => formik.setFieldValue('stock', text)}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Precio Unitario *</Text>
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                placeholder="0.00"
                style={styles.priceInput}
                value={formik.values.precioUnitario}
                keyboardType="numeric"
                onChangeText={(text) => formik.setFieldValue('precioUnitario', text)}
              />
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Precio de compra</Text>
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                placeholder="0.00"
                style={styles.priceInput}
                value={formik.values.precioCompra}
                keyboardType="numeric"
                onChangeText={(text) => formik.setFieldValue('precioCompra', text)}
              />
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Precio con Descuento (Opcional)</Text>
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                placeholder="0.00"
                style={styles.priceInput}
                value={formik.values.precioDescuento}
                keyboardType="numeric"
                onChangeText={(text) => formik.setFieldValue('precioDescuento', text)}
              />
            </View>
          </View>
        </View>

        {/* CATEGORIZACIÓN */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#ECFDF5' }]}>
              <Icon name="tag" size={18} color="#10B981" />
            </View>
            <Text style={styles.sectionTitle}>Categorización</Text>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Categoría *</Text>
            <InputSelectAdd
              value={formik.values.NameCategoria}
              onChange={(id, item) => {
                formik.setFieldValue('categoria', id)
                formik.setFieldValue('NameCategoria', item.descripcion)
              }}
              name={'Categoría'}
              path={'categorie'}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Marca *</Text>
            <InputSelectAdd
              value={formik.values.NameMarca}
              onChange={(id, item) => {
                formik.setFieldValue('marca', id)
                formik.setFieldValue('NameMarca', item.descripcion)
              }}
              name={'Marca'}
              path={'brand'}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Proveedor *</Text>
            <InputSelectAdd
              value={formik.values.NameProveedor}
              onChange={(id, item) => {
                formik.setFieldValue('proveedor', id)
                formik.setFieldValue('NameProveedor', item.descripcion)
              }}
              name={'Proveedor'}
              path={'provider'}
            />
          </View>

        </View>
        {/* Extras */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#FEE2E2' }]}>
              <Icon name="bookmark" size={18} color="#EF4444" />
            </View>
            <Text style={styles.sectionTitle}>Extras</Text>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Sabor</Text>
            <TextInput
              placeholder="Ej: Sabor del producto"
              style={styles.input}
              value={formik.values.sabor}
              onChangeText={(text) => formik.setFieldValue('sabor', text)}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Codigo de barras</Text>
            <TextInput
              placeholder="Ej: 1234567890"
              style={styles.input}
              value={formik.values.codigoBarra}
              onChangeText={(text) => formik.setFieldValue('codigoBarra', text)}
            />
          </View>

        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        {/* <Button text={'Cancelar'} onPress={() => navigation.goBack()} />
        <Button text={'Aceptar'} onPress={formik.handleSubmit} /> */}
        <TouchableOpacity
          style={{
            flex: 1,
            margin: 4,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#6B7280',
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 10,
            minWidth: 120,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 3,
          }}
          onPress={() => navigation.goBack()}
        >
          <Icon name="x" size={16} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{
            color: '#fff',
            fontSize: 14,
            fontWeight: '600',
            fontFamily: 'Cairo-Bold'
          }}>
            Cancelar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flex: 1,
            margin: 4,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#2366CB',
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 10,
            minWidth: 120,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 3,
          }}
          onPress={formik.handleSubmit}
        >
          <Icon name="save" size={16} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{
            color: '#fff',
            fontSize: 14,
            fontWeight: '600',
            fontFamily: 'Cairo-Bold'
          }}>
            Guardar
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  input: {
    marginVertical: 10,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 10,
    color: '#7F8487',
    borderColor: '#D9D9D9',
    fontSize: 14,
    backgroundColor: '#fff'
  },
  headerContainer: {
    backgroundColor: HEADER_BLUE,
    paddingTop: 50,
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
  // New styles for redesigned form
  sectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 15,
    marginTop: 15,
    paddingHorizontal: 15,
    paddingVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  fieldContainer: {
    marginBottom: 10,
    position: 'relative',
    zIndex: 100,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#7F8487',
    marginBottom: 5,
    fontFamily: 'Cairo-Regular',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D9D9D9',
    borderRadius: 10,
    backgroundColor: '#fff',
    marginVertical: 10,
  },
  currencySymbol: {
    paddingHorizontal: 15,
    fontSize: 14,
    color: '#7F8487',
  },
  priceInput: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 0,
    fontSize: 14,
    color: '#7F8487',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 15,
    paddingHorizontal: 15,
  },
})

function initialValues(item) {
  return {
    _id: item?._id || "",
    descripcion: item?.descripcion || "",
    codigoBarra: item?.codigoBarra || "",
    stock: (item?.stock)?.toString() || 0,
    bulto: item?.bulto !== undefined ? (item?.bulto)?.toString() : 0,
    peso: {
      cantidad: item?.peso?.cantidad !== undefined ? (item?.peso?.cantidad).toString() : 0,
      unidad: item?.peso?.unidad !== undefined ? item?.peso?.unidad : "unidad"
    },
    categoria: item?.categoria || '',
    marca: item?.marca || '',
    proveedor: item?.proveedor || '',
    NameCategoria: item?.NameCategoria || '',
    NameMarca: item?.NameMarca || '',
    NameProveedor: item?.NameProveedor || '',
    sabor: item?.sabor || '',
    precioBulto: item?.precioBulto !== undefined ? (item?.precioBulto)?.toString() : 0,
    precioCompra: item?.precioCompra !== undefined ? (item?.precioCompra)?.toString() : 0,
    precioUnitario: item?.precioUnitario !== undefined ? (item?.precioUnitario)?.toString() : 0,
    precioDescuento: item?.precioDescuento !== undefined ? (item?.precioDescuento)?.toString() : 0
  }
}