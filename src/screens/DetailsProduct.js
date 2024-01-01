import { BackHandler, Image, StyleSheet, Text, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { getUser } from '../redux/userSlice';
import { useAppSelector } from '../redux/hook';
import apiClient from '../utils/client';
import Button from '../components/Button';
import Logo from '../components/Logo';
import { io } from 'socket.io-client';


export default function DetailsProduct({ route, navigation }) {

  const { id } = route.params;
  const user = useAppSelector(getUser);
  const [details, setDetails] = useState(undefined)

  const getDetails = () => {
    apiClient.get(`/product/${id}`,
    {
        headers: {
          Authorization: `Bearer ${user.token}` // Agregar el token en el encabezado como "Bearer {token}"
        },
    })
    .then(response=>{
      setDetails(response.data[0])
    })
    .catch(e=>console.log("error", e))
  }

  useEffect(() => {
    getDetails()
  }, [])

  useEffect(()=>{
    const socket = io('https://apigolozur.onrender.com'

)
    socket.on(`/product`, (socket) => {
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

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      getDetails()
    });

    return unsubscribe
  }, [navigation]);
  

  return (
    <View style={{padding: 15}}>
      <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 5, padding: 15, shadowColor: "#000"}} >
        <Image source={require('../../assets/icon.png')} style={{width: 150, height: 150}} />
      </View>
      <View style={{paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginVertical: 10}} >
        <Button text={'Modificar'} fontSize={14} width={'20%'} onPress={()=>navigation.navigate('EditProduct', {
            id,
            details
        })} />
        <Button text={'Desabilitar'} fontSize={14} width={'20%'} onPress={()=>{}} />
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