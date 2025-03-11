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

export default function Home({navigation}) {


  const user = useAppSelector(getUser);
  const dispatch = useAppDispatch();
  const {data: userLocalStorage, clearData} = useLocalStorage([], 'user')
  const {data: saleStorage, clearData: clearDataSaleStorage} = useLocalStorage([],'saleStorage')
  const {offline, setModeOffline, isSaleStorage, correctMode} = useContext(OfflineContext)
  
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 25
  }
})

