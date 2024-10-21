import { View, Text, StyleSheet, TextInput, Pressable, FlatList, ScrollView } from 'react-native'
import React, { useEffect, useState } from 'react'
import ArrowDown from "react-native-vector-icons/MaterialIcons";
import apiClient from '../utils/client';
import { useAppDispatch, useAppSelector } from '../redux/hook';
import { getUser } from '../redux/userSlice';
import io from 'socket.io-client'
import { setAlert } from '../redux/alertSlice'
import useLocalStorage from '../hooks/useLocalStorage';


export default function InputSelectAdd({value, onChange, name, path}) {

    const [open, setOpen] = useState(false)
    const user = useAppSelector(getUser) 
    const {data: userStorage} = useLocalStorage([],'user')
    const [data, setData] = useState([])
    const [inputValue, setInputValue] = useState(value ? value : '')
    const [isActive, setIsActive] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const [loading, setLoading] = useState(false)
    const [loading2, setLoading2] = useState(false)
    const dispatch = useAppDispatch();

    const getData = () => {
        setLoading(true)
        apiClient.get(`${path}`,
        {
            headers: {
              Authorization: `Bearer ${user.token || userStorage.token}` // Agregar el token en el encabezado como "Bearer {token}"
            },
        })
        .then(response=>{
            setData(response.data)
            setLoading(false)
        })
        .catch(e=>console.log(e))
    }

    const addValue = (item) => {
        onChange(item._id, item)
        setInputValue(item.descripcion)
        setOpen(false)
        setIsActive(true);
        setIsFocused(true);
    };

    const cleanValue = () => {
        onChange('', '')
        setInputValue('')
        setIsActive(false);
        setIsFocused(false);
    }

    const handleInputFocus = () => {
        setIsActive(true);
        setIsFocused(true);
    };

    const handleInputBlur = () => {
      setIsActive(inputValue !== '');
      setIsFocused(false);
    };

    const handleInputChange = (event) => {
      setInputValue(event);
    };

    const postValue = () => {
        setLoading2(true)
        apiClient.post(`/${path}`, {descripcion: inputValue},
        {
          headers: {
            Authorization: `Bearer ${user.token || userStorage.token}` // Agregar el token en el encabezado como "Bearer {token}"
          }
        })
        .then((r)=>{
          onChange(r.data._id, r.data)
          dispatch(setAlert({
            message: `${name} creada correctamente`,
            type: 'success'
          }))
          setLoading2(false)
        })
        .catch(e=>{
          setLoading2(false)
          dispatch(setAlert({
          message: `${e.response.data.error || 'Ocurrio un error'}`,
          type: 'error'
        }))})
      }
    
      const patchValue = () => {
        setLoading2(true)
        apiClient.patch(`/${path}/${value}`, {_id: value, descripcion: inputValue},
        {
          headers: {
            Authorization: `Bearer ${user.token || userStorage.token}` // Agregar el token en el encabezado como "Bearer {token}"
          }
        })
        .then((r)=>{
          onChange('', '')
          dispatch(setAlert({
            message: `${name} modificada correctamente`,
            type: 'success'
          }))
          setLoading2(false)
        })
        .catch(e=>{
          setLoading2(false)
          dispatch(setAlert({
            message: `${e.response.data.error || 'Ocurrio un error'}`,
            type: 'error'
          }))
        })
      }

    useEffect(()=>{
        getData()
    }, [user.token])

    useEffect(()=>{
        if (value === '' || value === undefined) {
          setInputValue('')
          setIsActive(false);
          setIsFocused(false);
        }else {
          setIsActive(true);
          setIsFocused(true);
        }
    },[value])

    useEffect(()=>{
        const socket = io('https://apigolozur.onrender.com')
        socket.on(`${path}`, (socket) => {
          setData((prevData)=>{
            const exist = prevData.find(elem => elem._id === socket.data._id )
            if (exist) {
              return prevData.map((item) =>
                item._id === socket.data._id ? socket.data : item
              )
            }
            return [...prevData, socket.data]
          })
        })
        return () => {
          socket.disconnect();
        }; 
    },[data])
    
    useEffect(()=>{
        if (inputValue !== '') {
          setOpen(false)
        }
    },[inputValue])

  return (
    <View>
      <TextInput placeholder={name} style={styles.input}
          value={inputValue}
          onChangeText={handleInputChange}
          focusable={isFocused}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
      />
      {
        inputValue === '' ? 
        <Pressable style={{position: 'absolute', right: 10, top: '25%'}} onPress={()=>setOpen(!open)} >
            <ArrowDown name='keyboard-arrow-down' size={28} color={'#7F8487'} />
        </Pressable>
        :
            (value === '' || value === undefined) ? 
                loading2 ? 
                <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginVertical: 5, marginStart: 15}}>Cargando...</Text>
                :
                <Pressable style={{position: 'absolute', right: 10, top: '25%'}} onPress={postValue} >
                    <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginVertical: 5, marginStart: 15}}>Agregar</Text>
                </Pressable>
            :
                loading2 ? 
                <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginVertical: 5, marginStart: 15}}>Cargando...</Text>
                :
                <View style={{position: 'absolute', right: 10, top: '25%', flexDirection: 'row'}}>
                    <Pressable onPress={patchValue} >
                        <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginVertical: 5, marginStart: 15}}>Modificar</Text>
                    </Pressable>
                    <Pressable onPress={cleanValue} >
                        <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginVertical: 5, marginStart: 15}}>Quitar</Text>
                    </Pressable>
                </View>
      }
      <View style={[styles.list, {display: open ? 'block' : 'none'}]} >
        <ScrollView nestedScrollEnabled={true}>
            {
                loading ?
                <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginVertical: 5, marginStart: 15}}>Cargando...</Text>
                :
                data.length === 0 ?
                <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginVertical: 5, marginStart: 15}}>Lista Vacias</Text>
                :
                data.map((item)=>(
                    <Pressable onPress={()=>addValue(item)} key={item._id}  >
                        <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginVertical: 5, marginStart: 15}}>{item.descripcion}</Text>
                    </Pressable>
                ))
            }
        </ScrollView>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
    input: {
        marginVertical: 10,
        borderWidth: 1,
        paddingHorizontal: 15,
        paddingVertical: 5,
        borderRadius: 10,
        color: '#7F8487',
        borderColor: '#D9D9D9',
        fontSize: 14,
        backgroundColor: '#fff'
    },
    list: {
      position: 'absolute', 
      maxHeight: 150, 
      backgroundColor: '#fff', 
      width: '100%', 
      top: 40, 
      zIndex: 2, 
      paddingVertical: 10, 
      borderWidth: 1,
      borderColor: '#d9d9d9',
      borderBottomEndRadius: 10,
      borderBottomLeftRadius: 10
    }
})