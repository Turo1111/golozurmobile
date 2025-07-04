import { BackHandler, Image, ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import React, { useEffect, useState } from 'react'
import { getUser } from '../redux/userSlice';
import { useAppDispatch, useAppSelector } from '../redux/hook';
import apiClient from '../utils/client';
import Button from '../components/Button';
import Logo from '../components/Logo';
import { io } from 'socket.io-client';
import { MediaTypeOptions, launchImageLibraryAsync } from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { setAlert } from '../redux/alertSlice';
import useLocalStorage from '../hooks/useLocalStorage';
import { clearLoading, setLoading } from '../redux/loadingSlice'
import usePermissionCheck from '../hooks/usePermissionCheck';
import Icon from 'react-native-vector-icons/Feather';
import Icon2 from 'react-native-vector-icons/AntDesign';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Constants from 'expo-constants';

const DB_HOST = Constants.expoConfig?.extra?.DB_HOST;

export default function DetailsProduct({ route, navigation }) {

  const { id } = route.params;
  const user = useAppSelector(getUser)
  const { data: userStorage } = useLocalStorage([], 'user')
  const [details, setDetails] = useState(undefined)
  const [image, setImage] = useState(undefined)
  const [imageFile, setImageFile] = useState(undefined)
  const dispatch = useAppDispatch();

  const { hasPermission: hasPermissionReadProduct, isLoading: isLoadingReadProduct } = usePermissionCheck('read_product', () => {
    dispatch(setAlert({
      message: `No tienes permisos para crear productos`,
      type: 'warning'
    }))
    navigation.goBack()
  })

  const { hasPermission: hasPermissionUpdateProduct, isLoading: isLoadingUpdateProduct } = usePermissionCheck('update_product', () => { })

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await launchImageLibraryAsync({
      mediaTypes: MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      uploadImage(result.assets[0].uri)
    }
  };

  const uploadImage = async (uri) => {
    try {
      let filename = ''
      await FileSystem.uploadAsync('http://10.0.2.2:5000/product/uploadImage', uri, {
        fieldName: 'myfile',
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      })
        .then((response) => {
          const parsedResponse = JSON.parse(response.body)
          filename = `/${parsedResponse.filename}`
        })
        .catch((e) => console.log("error", e))

      await apiClient.patch(`/product/${id}`, { path: filename },
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
          navigation.goBack()
        })
        .catch(e => {
          console.log('error', e);
          dispatch(clearLoading())
          dispatch(setAlert({
            message: `${e.response.data.error || 'Ocurrio un error'}`,
            type: 'error'
          }))
        })
    } catch (error) {
      console.log(error);
    }

  };

  const getDetails = () => {
    dispatch(setLoading({
      message: `Cargando datos`
    }))
    apiClient.get(`/product/${id}`,
      {
        headers: {
          Authorization: `Bearer ${user.token || userStorage.token}` // Agregar el token en el encabezado como "Bearer {token}"
        },
      })
      .then(response => {
        /* setImage(`http://localhost:3002/storage/${response.data[0].path}`) */
        setDetails(response.data[0])
        dispatch(clearLoading())
      })
      .catch(e => {
        console.log("error getdetail", e); dispatch(clearLoading())
        dispatch(setAlert({
          message: `${e.response?.data || 'Ocurrio un error'}`,
          type: 'error'
        }))
      })
  }

  const getImage = (path) => {
    apiClient.get(`/product/image/${path}`,
      {
        headers: {
          Authorization: `Bearer ${user.token || userStorage.token}` // Agregar el token en el encabezado como "Bearer {token}"
        },
      })
      .then(response => {
        /* setImageFile() */
      })
      .catch(e => console.log("error get image", e))
  }

  useEffect(() => {
    if (user.token !== '' || userStorage.length !== 0) {
      getDetails()
    }
  }, [user, userStorage])

  useEffect(() => {
    const uri = Constants?.expoConfig?.hostUri
      ? Constants.expoConfig.hostUri.split(`:`).shift().concat(`:8080`)
      : `yourapi.com`
    if (details?.path) {
      getImage(details.path.split('/')[1])
    }
  }, [details])

  useEffect(() => {
    const socket = io(DB_HOST)
    socket.on(`product`, (socket) => {
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

  if (isLoadingReadProduct || !hasPermissionReadProduct) {
    return null
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f6f8fa' }}>
      {/* HEADER */}
      <View style={{ backgroundColor: '#2563eb', borderBottomLeftRadius: 18, borderBottomRightRadius: 18, paddingTop: 40, paddingBottom: 18, paddingHorizontal: 15, elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, marginRight: 10 }}>
              <Icon name="arrow-left" size={18} color="#fff" />
            </TouchableOpacity>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Detalles del Producto</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.18)', borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 2 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50' }} />
              <Text style={{ color: '#fff', fontSize: 13, marginLeft: 4 }}>Online</Text>
            </View>
            <TouchableOpacity onPress={getDetails} style={{ marginLeft: 8, padding: 4, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10 }}>
              <Icon name="refresh-cw" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {/* CONTENIDO PRINCIPAL */}
      <View style={{ alignItems: 'center', marginTop: 20 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 18, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
          <Image source={image ? { uri: image } : require('../../assets/icon.png')} style={{ width: 120, height: 140, borderRadius: 18, resizeMode: 'contain' }} />
          {hasPermissionUpdateProduct && (
            <TouchableOpacity style={{ position: 'absolute', bottom: 10, right: 10, backgroundColor: '#2563eb', borderRadius: 20, padding: 6 }} onPress={pickImage}>
              <Icon name="camera" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: '#252525', fontSize: 18, fontWeight: 'bold', marginTop: 16 }}>{details?.descripcion || 'No definido'}</Text>
          {hasPermissionUpdateProduct && (
            <TouchableOpacity style={{ backgroundColor: '#2563eb', borderRadius: 8, padding: 8, marginTop: 16, marginLeft: 10 }} onPress={() => navigation.navigate('EditProduct', { id, details })}>
              <Icon name="edit" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <View style={{ backgroundColor: '#e3eefd', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2, marginRight: 8 }}>
            <Text style={{ color: '#2563eb', fontSize: 13 }}>{details?.NameCategoria || ''}</Text>
          </View>
          <View style={{ backgroundColor: '#e3eefd', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2 }}>
            <Text style={{ color: '#2563eb', fontSize: 13 }}>{details?.NameMarca || ''}</Text>
          </View>
        </View>
      </View>
      {/* RESUMEN */}
      <ScrollView style={{ flex: 1, marginHorizontal: 0, marginTop: 0, backgroundColor: '#fff', marginTop: 18 }} contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8, backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 10, paddingVertical: 12 }}>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ color: '#2563eb', fontSize: 20, fontWeight: 'bold' }}>{details?.precioUnitario ? `$${Number(details.precioUnitario).toFixed(2)}` : '--'}</Text>
            <Text style={{ color: '#7F8487', fontSize: 13 }}>Precio Unitario</Text>
          </View>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: '#4CAF50', fontSize: 20, fontWeight: 'bold' }}>{details?.stock ?? '--'}</Text>
              <FontAwesome5 name="boxes" size={24} color="#4CAF50" style={{ marginLeft: 6 }} />
            </View>
            <Text style={{ color: '#7F8487', fontSize: 13 }}>En Stock</Text>
          </View>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ color: '#FA9B50', fontSize: 20, fontWeight: 'bold' }}>{details?.vendidos ?? '--'}</Text>
            <Text style={{ color: '#7F8487', fontSize: 13 }}>Vendidos</Text>
          </View>
        </View>
        <View style={styles.infoCardStyle}>
          <View style={styles.infoCardTitleRow}>
            <View style={{ backgroundColor: '#2563eb', borderRadius: 20, padding: 6, marginRight: 8 }}>
              <Icon name="info" size={16} color="#fff" />
            </View>
            <Text style={[styles.infoCardTitleText, { fontSize: 18 }]}>Información General</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="tag" size={18} color="#7F8487" style={{ marginRight: 12 }} />
            <Text style={styles.infoLabel}>Descripción</Text>
            <View style={{ flex: 1 }} />
            <Text style={styles.infoValue}>{details?.descripcion || '--'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="layers" size={18} color="#7F8487" style={{ marginRight: 12 }} />
            <Text style={styles.infoLabel}>Categoría</Text>
            <View style={{ flex: 1 }} />
            <Text style={[styles.infoValue, { color: '#2563eb' }]}>{details?.NameCategoria || '--'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon2 name="copyright" size={18} color="#7F8487" style={{ marginRight: 12 }} />
            <Text style={styles.infoLabel}>Marca</Text>
            <View style={{ flex: 1 }} />
            <Text style={styles.infoValue}>{details?.NameMarca || '--'}</Text>
          </View>
          {
            hasPermissionUpdateProduct && (
              <View style={styles.infoRow}>
                <Icon name="truck" size={18} color="#7F8487" style={{ marginRight: 12 }} />
                <Text style={styles.infoLabel}>Proveedor</Text>
                <View style={{ flex: 1 }} />
                <Text style={styles.infoValue}>{details?.NameProveedor || '--'}</Text>
              </View>
            )
          }
        </View>
        <View style={styles.infoCardStyle}>
          <View style={styles.infoCardTitleRow}>
            <View style={{ backgroundColor: '#4CAF50', borderRadius: 20, padding: 6, marginRight: 8 }}>
              <Icon name="dollar-sign" size={16} color="#fff" />
            </View>
            <Text style={[styles.infoCardTitleText, { fontSize: 18 }]}>Información de Precios</Text>
          </View>
          {
            hasPermissionUpdateProduct && (
              <View style={styles.infoRow}>
                <Icon2 name="shoppingcart" size={18} color="#7F8487" style={{ marginRight: 12 }} />
                <Text style={styles.infoLabel}>Precio de Compra</Text>
                <View style={{ flex: 1 }} />
                <Text style={styles.infoValue}>{details?.precioCompra ? `$${Number(details.precioCompra).toFixed(2)}` : '--'}</Text>
              </View>
            )
          }
          <View style={styles.infoRow}>
            <Icon2 name="creditcard" size={18} color="#2563eb" style={{ marginRight: 12 }} />
            <Text style={styles.infoLabel}>Precio de Venta</Text>
            <View style={{ flex: 1 }} />
            <Text style={[styles.infoValue, { color: '#2563eb', fontWeight: 'bold' }]}>{details?.precioUnitario ? `$${Number(details.precioUnitario).toFixed(2)}` : '--'}</Text>
          </View>
        </View>
        <View style={styles.infoCardStyle}>
          <View style={styles.infoCardTitleRow}>
            <View style={{ backgroundColor: '#e5e7eb', borderRadius: 20, padding: 6, marginRight: 8 }}>
              <FontAwesome5 name="clipboard-list" size={16} color="#7F8487" />
            </View>
            <Text style={[styles.infoCardTitleText, { fontSize: 18 }]}>Información Adicional</Text>
          </View>
          <View style={styles.infoRow}>
            <FontAwesome5 name="barcode" size={18} color="#7F8487" style={{ marginRight: 12 }} />
            <Text style={styles.infoLabel}>Código de Barras</Text>
            <View style={{ flex: 1 }} />
            <Text style={styles.infoValue}>{details?.codigoBarras || '--'}</Text>
          </View>
          <View style={styles.infoRow}>
            <FontAwesome5 name="calendar-plus" size={18} color="#7F8487" style={{ marginRight: 12 }} />
            <Text style={styles.infoLabel}>Fecha de Creación</Text>
            <View style={{ flex: 1 }} />
            <Text style={styles.infoValue}>
              {details?.createdAt ? new Date(details.createdAt).toLocaleDateString('es-ES') : '--'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="edit-2" size={18} color="#7F8487" style={{ marginRight: 12 }} />
            <Text style={styles.infoLabel}>Última Modificación</Text>
            <View style={{ flex: 1 }} />
            <Text style={styles.infoValue}>
              {details?.updatedAt ? new Date(details.updatedAt).toLocaleDateString('es-ES') : '--'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  // Estilos para las cards y filas de info
  infoCardStyle: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 10,
    marginTop: 14,
    marginBottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  infoCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoCardTitleText: {
    color: '#252525',
    fontWeight: 'bold',
    fontSize: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    marginBottom: 0,
  },
  infoLabel: {
    color: '#7F8487',
    fontSize: 14,
  },
  infoValue: {
    color: '#252525',
    fontSize: 14,
    fontWeight: '500',
  },
})

