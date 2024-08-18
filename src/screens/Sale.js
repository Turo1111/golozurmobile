import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { getUser } from '../redux/userSlice';
import { getLoading } from '../redux/loadingSlice';
import { useAppDispatch, useAppSelector } from '../redux/hook';
import apiClient from '../utils/client';
import Search from '../components/Search';
import Button from '../components/Button';
import { useInputValue } from '../hooks/useInputValue';
import { io } from 'socket.io-client';

export default function Sale({navigation}) {

    const user = useAppSelector(getUser);
    const loading = useAppSelector(getLoading)
    const dispatch = useAppDispatch();
    const [data, setData] = useState([])
    const search = useInputValue('','')

    const getSale = async () => {
          apiClient.get('/sale',{
            headers: {
              Authorization: `Bearer ${user.token}` 
            }
          })
          .then(r=>{
              setData(prevData=>{
                return r.data
              })
          })
          .catch(e=>{console.log("error getSale",e);})
      }
  
      useEffect(()=>{
        if (user) {
          getSale()
        }
      },[user])

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
        <Search placeholder={'Buscar ventas'} searchInput={search} />
        <View style={{paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', margin: 15}} >
          <Button text={'Nuevo'} fontSize={14} width={'45%'} onPress={()=>{navigation.navigate('NewSale')}} />
        </View>
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
          }}
        />
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