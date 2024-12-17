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
import ThermalPrinterModule from 'react-native-thermal-printer';

ThermalPrinterModule.defaultConfig = {
  ...ThermalPrinterModule.defaultConfig,
  ip: '192.168.100.246',
  port: 9100,
  timeout: 30000,
};


export default function Home({navigation}) {

  console.log(ThermalPrinterModule);

  const user = useAppSelector(getUser);
  const dispatch = useAppDispatch();
  const {data: userLocalStorage, clearData} = useLocalStorage([], 'user')
  const {data: saleStorage, clearData: clearDataSaleStorage} = useLocalStorage([],'saleStorage')
  const {offline, setModeOffline, isSaleStorage, correctMode} = useContext(OfflineContext)

  const [state, setState] = useState({
    text:
      '[C]<img>https://via.placeholder.com/300.jpg</img>\n' +
      '[L]\n' +
      "[C]<u><font size='big'>ORDER N°045</font></u>\n" +
      '[L]\n' +
      '[C]================================\n' +
      '[L]\n' +
      '[L]<b>BEAUTIFUL SHIRT</b>[R]9.99e\n' +
      '[L]  + Size : S\n' +
      '[L]\n' +
      '[L]<b>AWESOME HAT</b>[R]24.99e\n' +
      '[L]  + Size : 57/58\n' +
      '[L]\n' +
      '[C]--------------------------------\n' +
      '[R]TOTAL PRICE :[R]34.98e\n' +
      '[R]TAX :[R]4.23e\n' +
      '[L]\n' +
      '[C]================================\n' +
      '[L]\n' +
      "[L]<font size='tall'>Customer :</font>\n" +
      '[L]Raymond DUPONT\n' +
      '[L]5 rue des girafes\n' +
      '[L]31547 PERPETES\n' +
      '[L]Tel : +33801201456\n' +
      '[L]\n' +
      "[C]<barcode type='ean13' height='10'>831254784551</barcode>\n" +
      "[C]<qrcode size='20'>http://www.developpeur-web.dantsu.com/</qrcode>",
  });

  const onPress = async () => {
    try {
      console.log('Intentando imprimir...');
      
      if (ThermalPrinterModule) {
        // Prueba imprimir texto
        await ThermalPrinterModule.printTcp({ payload: state.text });
        console.log('Impresión completada.');
      } else {
        console.log('El módulo ThermalPrinterModule no está disponible.');
      }
    } catch (err) {
      console.error('Error al imprimir:', err.message);
    }
  };
  
  const logOut = async () => {
    try {
      await clearData();
      await dispatch(clearUser());
    } catch (error) {
      console.error(error);
    }
    navigation.goBack();
  }

  return (
    <View style={styles.container}>
      <Logo/>
      <View style={{flexDirection: 'row', padding: 15, justifyContent: 'space-between', alignItems: 'center'}}>
        <Text style={{fontSize: 18, fontFamily: 'Cairo-Regular', color: '#252525' }} >Bienvenido, {userLocalStorage?.nickname}</Text> 
        <Pressable onPress={logOut} >
          <Text style={{fontSize: 14, fontFamily: 'Cairo-Bold', color: '#537FE7' }} >Cerrar sesion</Text> 
        </Pressable>
      </View>
      <View style={{flexDirection: 'row', paddingHorizontal: 15, justifyContent: 'center', alignItems: 'center'}}>
        <ToggleButton onPress={async()=>{
          setModeOffline()
        }} />
      </View>
      {
        saleStorage?.length !== 0 &&
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
        onPress={onPress}
      >
        <SaleIcons name='sale' size={35} color='#252525' style={{textAlign: 'center'}} />
        <Text style={{fontSize: 18, fontFamily: 'Cairo-Regular', color: '#252525', textAlign: 'center', marginHorizontal: 25 }}>IMPRIMIR</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 25
  }
})

