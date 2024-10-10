import { BackHandler, Image, StyleSheet, Text, View } from 'react-native'
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
import { clearLoading } from '../redux/loadingSlice';
import Constants from 'expo-constants';
import useLocalStorage from '../hooks/useLocalStorage';

export default function DetailsProduct({ route, navigation }) {

  const { id } = route.params;
  const user = useAppSelector(getUser) 
  const {data: userStorage} = useLocalStorage([],'user')
  const [details, setDetails] = useState(undefined)
  const [image, setImage] = useState(undefined)
  const [imageFile, setImageFile] = useState(undefined)
  const dispatch = useAppDispatch();

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
      await FileSystem.uploadAsync('http://10.0.2.2:3002/product/uploadImage', uri, {
        fieldName: 'myfile',
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      })
      .then((response)=>{
        const parsedResponse = JSON.parse(response.body)
        filename = `/${parsedResponse.filename}`
        console.log(filename);
      })
      .catch((e)=>console.log("error",e))

      await apiClient.patch(`/product/${id}`, {path: filename},
            {
              headers: {
                Authorization: `Bearer ${user.token || userStorage.token}` // Agregar el token en el encabezado como "Bearer {token}"
              }
            })
            .then(async (r)=>{
              dispatch(setAlert({
                message: `Producto modificado correctamente`,
                type: 'success'
              }))
              dispatch(clearLoading())
              navigation.goBack()
            })
            .catch(e=>{
                console.log('error', e);
                dispatch(clearLoading())
              dispatch(setAlert({
              message: `${e.response.data.error || 'Ocurrio un error'}`,
              type: 'error'
            }))})  
    } catch (error) {
      console.log(error);
    }
  
  };

  const getDetails = () => {
    apiClient.get(`/product/${id}`,
    {
        headers: {
          Authorization: `Bearer ${user.token || userStorage.token}` // Agregar el token en el encabezado como "Bearer {token}"
        },
    })
    .then(response=>{
      /* setImage(`http://localhost:3002/storage/${response.data[0].path}`) */
      setDetails(response.data[0])
    })
    .catch(e=>console.log("error getdetail", e))
  }

  const getImage = (path) => {
    console.log('llamando', path)
    apiClient.get(`/product/image/${path}`,
    {
        headers: {
          Authorization: `Bearer ${user.token || userStorage.token}` // Agregar el token en el encabezado como "Bearer {token}"
        },
    })
    .then(response=>{
      console.log("imagen?",response.data)
      /* setImageFile() */
    })
    .catch(e=>console.log("error get image", e))
  }

  useEffect(() => {
    console.log("antes",user, userStorage, id)
    if (user.token !== '' || userStorage.length !== 0) {
      console.log("despues", user, userStorage)
      getDetails()
    }
  }, [user, userStorage])

  useEffect(() => {
    const uri = Constants?.expoConfig?.hostUri
    ? Constants.expoConfig.hostUri.split(`:`).shift().concat(`:8080`)
    : `yourapi.com`
    console.log(uri);
    if (details?.path) {
      console.log('path dividido', details.path.split('/')[1], details.descripcion)
      getImage(details.path.split('/')[1])
    }
  }, [details])

  useEffect(()=>{
    const socket = io('http://10.0.2.2:3002')
    socket.on(`product`, (socket) => {
      console.log("socket", socket)
      setDetails((prevData)=>{
        if (socket.data._id === id) {
          return socket.data
        }
        return prevData
      })
    })
    return () => {
      socket.disconnect();
    }; 
  },[id])

  return (
    <View style={{padding: 15}}>
      <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 5, padding: 15, shadowColor: "#000"}} >
        {/* {
          !imageFile ? 
          <Image source={image ? { uri: image } : require('../../assets/icon.png')} style={{width: 150, height: 180, borderRadius: 15}} />
          : */}
          <Image source={{uri:'https://i.imgur.com/weueadv.jpg'}} style={{width: 150, height: 180, borderRadius: 15}} />
        {/* } */}
      </View>
      <View style={{paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginVertical: 10}} >
        <Button text={'Modificar'} fontSize={14} width={'45%'} onPress={()=>navigation.navigate('EditProduct', {
            id,
            details
        })} />
        <Button text={'Elegir imagen'} fontSize={14} width={'45%'} onPress={pickImage} />
      </View>
      <Text style={{color: '#252525', fontSize: 18, fontFamily: 'Cairo-Bold', marginVertical: 5}}>Descripcion: {details?.descripcion || 'No definido'}</Text>
      <Text style={{color: '#252525', fontSize: 16, fontFamily: 'Cairo-Regular', marginVertical: 5}}>Stock: {details?.stock || 'No definido'}</Text>
      <Text style={{color: '#252525', fontSize: 16, fontFamily: 'Cairo-Regular', marginVertical: 5}}>Categoria: {details?.NameCategoria || 'No definido'}</Text>
      <Text style={{color: '#252525', fontSize: 16, fontFamily: 'Cairo-Regular', marginVertical: 5}}>Marca: {details?.NameMarca || 'No definido'}</Text>
      <Text style={{color: '#252525', fontSize: 16, fontFamily: 'Cairo-Regular', marginVertical: 5}}>Proveedor: {details?.NameProveedor || 'No definido'}</Text>
      <Text style={{color: '#252525', fontSize: 16, fontFamily: 'Cairo-Regular', marginVertical: 5}}>Codigo de barra: {details?.codigoBarra || 'Sin codigo'}</Text>
      <Text style={{color: '#252525', fontSize: 16, fontFamily: 'Cairo-Regular', marginVertical: 5}}>Peso: {details?.peso?.cantidad || 'No definido'} {details?.peso?.unidad}</Text>
      <Text style={{color: '#252525', fontSize: 16, fontFamily: 'Cairo-Regular', marginVertical: 5}}>Bulto: {details?.bulto || 'No definido'}</Text>
      <Text style={{color: '#252525', fontSize: 16, fontFamily: 'Cairo-Regular', marginVertical: 5}}>Precio por Bulto: {details?.precioBulto || 'No definido'}</Text>
      <Text style={{color: '#252525', fontSize: 16, fontFamily: 'Cairo-Regular', marginVertical: 5}}>Precio de compra: {details?.precioCompra || 'No definido'}</Text>
      <Text style={{color: '#252525', fontSize: 16, fontFamily: 'Cairo-Regular', marginVertical: 5}}>Precio unitario: {details?.precioUnitario || 'No definido'}</Text>
    </View>
  )
}

const styles = StyleSheet.create({})

