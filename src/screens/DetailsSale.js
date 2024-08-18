import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hook';
import { getUser } from '../redux/userSlice';
import apiClient from '../utils/client';
import Table from '../components/Table';

export default function DetailsSale({ route, navigation }) {

  const { id } = route.params;
  const user = useAppSelector(getUser);
  const [details, setDetails] = useState(undefined)
  const dispatch = useAppDispatch();

  const getDetails = () => {
    apiClient.get(`/sale/${id}`,
    {
        headers: {
          Authorization: `Bearer ${user.token}` // Agregar el token en el encabezado como "Bearer {token}"
        },
    })
    .then(response=>{
      console.log("res",response.data)
      setDetails(response.data)
    })
    .catch(e=>console.log("error", e))
  }

  useEffect(() => {
    getDetails()
  }, [])

  return (
    <View style={{padding: 5}}>
    {
      details && 
      <>
        <Text style={{fontSize: 18, color: '#252525', fontWeight: '600', marginLeft: 5, marginVertical: 5}}>Cliente: {details.r.cliente}</Text>
        <Text style={{fontSize: 18, color: '#252525', fontWeight: '600', marginLeft: 5, marginVertical: 5}}>Fecha: {details.r.createdAt.split("T")[0]}</Text>
        <Text style={{fontSize: 18, color: '#252525', fontWeight: '600', marginLeft: 5, marginVertical: 15}}>Productos</Text>
        <Table
          data={details.itemsSale}
          columns={columns}
          maxHeight={true}
          onClick={() => ''}
        />
        <View style={{flexDirection: 'row', justifyContent: 'flex-end'}} >
          <Text style={{fontSize: 18, color: '#252525', fontWeight: '600', marginLeft: 5, marginVertical: 15}}>Total: $ {details.r.total}</Text>
        </View>
      </>
    }
    </View>
  )
}

const columns = [
  { label: 'Producto', field: 'descripcion', width: '40%' },
  { label: 'Cantidad', field: 'cantidad', width: '20%', align: 'center' },
  { label: 'P. unitario', field: 'precioUnitario', width: '20%', align: 'center', price: true },
  { label: 'Total', field: 'total', width: '20%', align: 'center', price: true },
];

const styles = StyleSheet.create({
  item: {
        padding: 10,
        borderBottomWidth: 1,
        borderColor: '#ddd',
        justifyContent: 'space-between'
    },
})