import { Pressable, StyleSheet, Text, View } from 'react-native'
import React, { useEffect } from 'react'
import FeatherIcons from 'react-native-vector-icons/Feather'
import { clearUser, getUser } from '../redux/userSlice';
import { useAppDispatch, useAppSelector } from '../redux/hook';
import Logo from '../components/Logo';
import useLocalStorage from '../hooks/useLocalStorage';

export default function Home({navigation}) {

  const user = useAppSelector(getUser);
  const dispatch = useAppDispatch();
  const {data: userLocalStorage, clearData} = useLocalStorage([], 'user')

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
        <Text style={{fontSize: 18, fontFamily: 'Cairo-Regular', color: '#252525' }} >Bienvenido, {userLocalStorage?.user}</Text> 
        <Pressable onPress={logOut} >
          <Text style={{fontSize: 14, fontFamily: 'Cairo-Bold', color: '#537FE7' }} >Cerrar sesion</Text> 
        </Pressable>
      </View>
      <Pressable style={{borderColor: '#d9d9d9', borderWidth: 1, padding: 8, width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}} 
        onPress={()=>navigation.navigate('Product')}
      >
        <FeatherIcons name='box' size={35} color='#252525' style={{textAlign: 'center'}} />
        <Text style={{fontSize: 18, fontFamily: 'Cairo-Regular', color: '#252525', textAlign: 'center', marginHorizontal: 25 }}>PRODUCTOS</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 25
  }
})