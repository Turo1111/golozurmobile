import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hook';
import { getUser } from '../redux/userSlice';
import apiClient from '../utils/client';
import Table from '../components/Table';
import useLocalStorage from '../hooks/useLocalStorage';
import Button from '../components/Button';
import { clearLoading, setLoading } from '../redux/loadingSlice'
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function DetailsSale({ route, navigation }) {

  const { id } = route.params;
  const user = useAppSelector(getUser) 
  const {data: userStorage} = useLocalStorage([],'user')
  const [details, setDetails] = useState(undefined)
  const dispatch = useAppDispatch();

  const getDetails = () => {
    dispatch(setLoading({
      message: `Cargando datos`
    }))
    apiClient.get(`/sale/${id}`,
    {
        headers: {
          Authorization: `Bearer ${user.token || userStorage.token}` // Agregar el token en el encabezado como "Bearer {token}"
        },
    })
    .then(response=>{
      console.log("res",response.data)
      setDetails(response.data)
      dispatch(clearLoading())
    })
    .catch(e=>{console.log("error", e);dispatch(clearLoading())})
  }

  useEffect(() => {
    if (user.token !== '' || userStorage.length !== 0) {
      
    }
    getDetails()
  }, [user, userStorage])

  const generatePdf = async () => {
    const itemsText = details.itemsSale.map(item => `
      <div class="it">
        <p class="it">${(item.descripcion).toUpperCase()}</p>
        <div class="itemList">
          <div class="flex" >
            <p class="it">${item.cantidad}x</p>
            <p class="it">$${(item.precioUnitario).toLocaleString('es-ES')}</p>
          </div>
          <p class="it">$${(item.total).toLocaleString('es-ES')}</p>
        </div>
      </div>
    `).join('');
  
    const htmlContent = `
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
              font-size: 18px;
            }
            .header p {
              padding: 0;
              margin: 0;
              margin-bottom: 2px;
              font-size: 18px;
            }
            .details {
              margin: 0;
              font-size: 20px;
              padding: 0;
            }
            .flex {
              display: flex;
              margin: 0;
              padding: 0;
            }
            .itemList{
              display: flex;
              padding: 0px 3px;
              margin: 0;
              padding: 0;
              justify-content: space-between;
            }
            .it{
              margin: 0;
              padding: 0;
            }
            .total {
              margin: 0;
              font-weight: bold;
              text-align: right;
              font-size: 22px;
              padding: 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>GOLOZUR</h2>
            <p>Fecha: ${details.r.createdAt.split("T")[0]}</p>
            <p>Cliente: ${details.r.cliente}</p>
            <p>*NO VALIDO COMO FACTURA</p>
          </div>
          <hr/>
          <div class="details">
            ${itemsText}
          </div>
          <hr/>
          <div class="total">
            <p>Total Neto $ ${(details.r.total).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </body>
      </html>
    `;
  
    try {
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
    } catch (error) {
      console.error('Error generando el PDF:', error);
    }
  };

  return (
    <View style={{padding: 5}}>
    <Button text={'Imprimir ticket'} onPress={generatePdf} />
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