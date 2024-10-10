import { Pressable, StyleSheet, Text, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import FeatherIcons from 'react-native-vector-icons/Feather'
import SaleIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { clearUser, getUser } from '../redux/userSlice';
import { useAppDispatch, useAppSelector } from '../redux/hook';
import Logo from '../components/Logo';
import useLocalStorage from '../hooks/useLocalStorage';
import ToggleButton from '../components/ToggleButton';
import { OfflineContext } from '../context.js/contextOffline';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// Simulación de datos del carrito
const cartItems = [
  { name: 'ACE C/DOWNY FLORAL 1/1kg C-18', quantity: 1, unitPrice: 26.69, totalPrice: 26.69 },
  { name: 'EJOTE ENTERO CORTADO S&W 1/411', quantity: 1, unitPrice: 10.60, totalPrice: 10.60 },
  { name: 'ACE C/DOWNY FLORAL 1/1kg C-18', quantity: 1, unitPrice: 26.69, totalPrice: 26.69 },
  { name: 'EJOTE ENTERO CORTADO S&W 1/411', quantity: 1, unitPrice: 10.60, totalPrice: 10.60 },
  { name: 'ACE C/DOWNY FLORAL 1/1kg C-18', quantity: 1, unitPrice: 26.69, totalPrice: 26.69 },
  { name: 'EJOTE ENTERO CORTADO S&W 1/411', quantity: 1, unitPrice: 10.60, totalPrice: 10.60 },
  { name: 'ACE C/DOWNY FLORAL 1/1kg C-18', quantity: 1, unitPrice: 26.69, totalPrice: 26.69 },
  { name: 'EJOTE ENTERO CORTADO S&W 1/411', quantity: 1, unitPrice: 10.60, totalPrice: 10.60 },
  // Agrega más productos aquí para probar
];

export default function Home({navigation}) {

  const user = useAppSelector(getUser);
  const dispatch = useAppDispatch();
  const {data: userLocalStorage, clearData} = useLocalStorage([], 'user')
  const {data: saleStorage, clearData: clearDataSaleStorage} = useLocalStorage([],'saleStorage')
  const {offline, setModeOffline, isSaleStorage} = useContext(OfflineContext)
  
  const logOut = async () => {
    try {
      await clearData();
      await dispatch(clearUser());
    } catch (error) {
      console.error(error);
    }
    navigation.goBack();
  }

  const generatePdf = async () => {
    const itemsText = cartItems.map(item => `
      <div class="itemList">
        <p class="f-10 it">${item.quantity}</p>
        <p class="f-50 it">${item.name}</p>
        <p class="f-15 it">${item.unitPrice.toFixed(2)}</p>
        <p class="f-15 it">${item.totalPrice.toFixed(2)}</p>
      </div>
    `).join('');

    const totalAmount = cartItems.reduce((acc, item) => acc + item.totalPrice, 0);

    const htmlContent = `
      <html>
        <head>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 10px;
              margin: 0;
              padding: 0;
            }
            .header {
              margin-left: 5px;
              padding: 0px;
            }
            .header h2 {
              text-align: center;
              padding: 0;
              margin-bottom: 5px;
            }
            .header p {
              padding: 0;
              margin: 0;
              margin-bottom: 2px;
            }
            .details {
              margin: 0;
              font-size: 6px;
            }
            .flex {
              display: flex;
              margin: 0;
            }
            .it {
              margin-right: 5px;
            }
            .f-10{
             flex-basis: 10%;
             padding: 0;
              margin: 0;
              margin-bottom: 2px;
            }
            .f-50{
              flex-basis: 50%;
              padding: 0;
              margin: 0;
              margin-bottom: 2px;
            }
            .f-15{
             flex-basis: 15%;
             padding: 0;
              margin: 0;
              margin-bottom: 2px;
            }
            .itemList{
              display: flex;
              padding: 0px 3px;
            }
            .items {
              margin: 0;
            }
            .total {
              margin: 0;
              font-weight: bold;
              text-align: right;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>GOLOZUR</h2>
            <p>Fecha: ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}</p>
            <p>Cliente: PEPE</p>
            <p>*NO VALIDO COMO FACTURA</p>
          </div>

          <div class="details">
            <div class="flex">
              <p class="f-10 it" >CANT</p>
              <p class="f-50 it" >PRODUCTO</p>
              <p class="f-15 it">PRECIO</p>
              <p class="f-15 it">IMPORTE</p>
            </div>
            ${itemsText}
          </div>

          <div class="total">
            <p>Total Neto $ ${totalAmount.toFixed(2)}</p>
          </div>
          
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        width: 161.57,  // 57 mm en puntos
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
    <View style={styles.container}>
      <Logo/>
      <View style={{flexDirection: 'row', padding: 15, justifyContent: 'space-between', alignItems: 'center'}}>
        <Text style={{fontSize: 18, fontFamily: 'Cairo-Regular', color: '#252525' }} >Bienvenido, {userLocalStorage?.nickname}</Text> 
        <Pressable onPress={logOut} >
          <Text style={{fontSize: 14, fontFamily: 'Cairo-Bold', color: '#537FE7' }} >Cerrar sesion</Text> 
        </Pressable>
      </View>
      <View style={{flexDirection: 'row', paddingHorizontal: 15, justifyContent: 'space-between', alignItems: 'center'}}>
        <Text style={{fontSize: 18, fontFamily: 'Cairo-Regular', color: '#252525' }} >Modo online: </Text> 
        <ToggleButton onPress={async()=>{
          setModeOffline()
        }} />
      </View>
      {
        isSaleStorage &&
        <View style={{flexDirection: 'row', paddingHorizontal: 15, justifyContent: 'space-between', alignItems: 'center'}}>
        <Text style={{fontSize: 18, fontFamily: 'Cairo-Regular', color: '#252525' }} >Hay ventas sin guardar</Text> 
        </View>
      }
      <Pressable style={{borderColor: '#d9d9d9', borderWidth: 1, padding: 8, width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 10}} 
        onPress={()=>navigation.navigate('Product')}
      >
        <FeatherIcons name='box' size={35} color='#252525' style={{textAlign: 'center'}} />
        <Text style={{fontSize: 18, fontFamily: 'Cairo-Regular', color: '#252525', textAlign: 'center', marginHorizontal: 25 }}>PRODUCTOS</Text>
      </Pressable>
      <Pressable style={{borderColor: '#d9d9d9', borderWidth: 1, padding: 8, width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 10}} 
        onPress={()=>navigation.navigate('Sale')}
      >
        <SaleIcons name='sale' size={35} color='#252525' style={{textAlign: 'center'}} />
        <Text style={{fontSize: 18, fontFamily: 'Cairo-Regular', color: '#252525', textAlign: 'center', marginHorizontal: 25 }}>VENTAS</Text>
      </Pressable>
      <Pressable style={{borderColor: '#d9d9d9', borderWidth: 1, padding: 8, width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 10}} 
        onPress={generatePdf}
      >
        <SaleIcons name='sale' size={35} color='#252525' style={{textAlign: 'center'}} />
        <Text style={{fontSize: 18, fontFamily: 'Cairo-Regular', color: '#252525', textAlign: 'center', marginHorizontal: 25 }}>PRUEBA IMPRIMIR</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 25
  }
})