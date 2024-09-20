import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { getUser } from '../redux/userSlice';
import { clearLoading, getLoading, setLoading } from '../redux/loadingSlice';
import { useAppDispatch, useAppSelector } from '../redux/hook';
import apiClient from '../utils/client';
import Search from '../components/Search';
import Button from '../components/Button';
import { useInputValue } from '../hooks/useInputValue';
import { io } from 'socket.io-client';
import useInternetStatus from '../hooks/useInternetStatus';
import { OfflineContext } from '../context.js/contextOffline';
import useLocalStorage from '../hooks/useLocalStorage';

export default function Sale({navigation}) {

    const user = useAppSelector(getUser)
    const loading = useAppSelector(getLoading)
    const dispatch = useAppDispatch();
    const [data, setData] = useState([])
    const search = useInputValue('','')

    const [query, setQuery] = useState({skip: 0, limit: 25})

    const {offline} = useContext(OfflineContext)

    const getSale = async (skip, limit) => {
      console.log(skip, limit)
      try {
        const response = await apiClient.post(`/sale/skip`, { skip, limit },
          {
              headers: {
                  Authorization: `Bearer ${user.token}`
              },
          });
          setData((prevData)=>{
            if (prevData) {
              if (prevData.length === 0) {
                  return response.data.array
              }
              const newData = response.data.array.filter((element) => {
                return prevData.findIndex((item) => item._id === element._id) === -1;
              });
              /* console.log([...prevData, ...newData]); */
              return [...prevData, ...newData];
            }
            return []
          })
      } catch (e) {
        console.log("error getSale",e)
      } finally {
        dispatch(clearLoading());
      }
    }

    const getSaleSearch = async (input) => {
      try {
          const response = await apiClient.post(`/sale/search`, {input});
          setDataSearch(response.data);
      } catch (e) {
          console.log("error sale search", e);
      } finally {
        dispatch(clearLoading())
      }
    }

    useEffect(()=>{
      if ( search.value !== '') {
        getSaleSearch(search)
      }
    },[search]) 

    useEffect(()=>{
      if (user) {
        getSale(query.skip, query.limit)
      }
    },[query])

    useEffect(()=>{
      const socket = io('http://10.0.2.2:3002')
      socket.on(`sale`, (socket) => {
          console.log('escucho', socket)
        setData((prevData)=>{
          return [...prevData, socket.data]
        })
      })
      return () => {
        socket.disconnect();
      }; 
    },[data])

  return (
    <View>
      {
        offline ?
        <View>

          <Search placeholder={'Buscar ventas'} searchInput={search} />
          <View style={{paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', margin: 15}} >
            <Button text={'Nuevo'} fontSize={14} width={'45%'} onPress={()=>{navigation.navigate('NewSale')}} />
          </View>
          <Text style={{fontSize: 18, fontFamily: 'Cairo-Regular', color: '#799351', paddingHorizontal: 15 }} >Estas en modo con conexion</Text>
          <FlatList 
            style={{height: '83%'}}
            data={data}
            renderItem={({ item }) =>{
              return (
                  <Pressable style={styles.item} onPress={()=>{
                      navigation.navigate('DetailsSale', {
                        id: item._id,
                        name: item.cliente,
                      })
                  }}>
                      <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', flex: 1}}>
                          <Text style={{fontSize: 18, color: '#252525'}}>{item.cliente}</Text>
                          <Text style={{fontSize: 18, fontWeight: 600, color: '#FA9B50'}}>$ {item.total}</Text>
                      </View>
                      <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'end', flex: 1}}>
                          <Text style={{fontSize: 14, color: '#252525',fontWeight: 500}}>{item.createdAt.split("T")[0]}</Text>
                      </View>
                  </Pressable>
              )
            }}
            keyExtractor={(item) => item._id}
            onEndReached={()=>{
              console.log('estoy en el final')
              if(!loading.open){
                if(search){
                  if(search.value === ''){
                    dispatch(setLoading({
                        message: `Cargando nuevas ventas`
                    }))
                    setQuery({skip: query.skip+15, limit: query.limit})
                  }
                }
              }
            }}
          />
        </View>:
        <View>
          <View style={{paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', margin: 15}} >
            <Button text={'Nuevo'} fontSize={14} width={'45%'} onPress={()=>{navigation.navigate('NewSale')}} />
          </View>
          <Text style={{fontSize: 18, fontFamily: 'Cairo-Regular', color: '#C7253E', paddingHorizontal: 15 }} >Estas en modo sin conexion</Text>
        </View>
      }
    </View>
  )
}

const styles = StyleSheet.create({
    item: {
        padding: 10,
        borderBottomWidth: 1,
        borderColor: '#ddd',
        justifyContent: 'space-between'
    },
})