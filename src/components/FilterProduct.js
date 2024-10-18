import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import Button from './Button'
import ModalContainer from './ModalContainer';
import InputSelect from './InputSelect';
import { useFormik } from 'formik';
import { useAppSelector } from '../redux/hook';
import { getUser } from '../redux/userSlice';
import apiClient from '../utils/client';
import { useDispatch } from 'react-redux';
import { clearLoading, setLoading } from '../redux/loadingSlice'

export default function FilterProduct({open, onClose, activeBrand, activeCategorie, activeProvider, selectCategorie, selectBrand, selectProvider}) {

    const user = useAppSelector(getUser)
    const dispatch = useDispatch()
    const [categorie, setCategorie] = useState([])
    const [brand, setBrand] = useState([])
    const [provider, setProvider] = useState([])

    const getCategorie = () => {
      dispatch(setLoading({
        message: `Cargando datos`
      }))
      apiClient.get(`/categorie`)
      .then(function(response){
        console.log(response.data)
        setCategorie([ {_id: 1 , descripcion: 'Todas'}, ...response.data]);dispatch(clearLoading())
      })
      .catch(function(error){
          console.log("get",error);;dispatch(clearLoading())
      })
    }

    const getBrand = () => {
      apiClient.get(`/brand`)
      .then(function(response){
        setBrand([ {_id: 1 , descripcion: 'Todas'}, ...response.data])
      })
      .catch(function(error){
          console.log("get",error);
      })
    }

    const getProvider = () => {
        apiClient.get(`/provider`)
        .then(function(response){
          setProvider([ {_id: 1 , descripcion: 'Todas'}, ...response.data])
        })
        .catch(function(error){
            console.log("get",error);
        })
      }

    useEffect(()=>{
      if (open) {
        getCategorie()
        getBrand()
        getProvider()
      }
    }, [open])

  return (
    <ModalContainer
        openModal={open}
        onClose={onClose}
        header={true}
        title='Filtrar productos'
        height={'auto'}
    >
        <Text style={{fontSize: 16, fontFamily: 'Cairo-Bold', color: '#716A6A'}}>CATEGORIAS</Text>
        <FlatList
          horizontal={true}
          data={categorie}
          renderItem={({ item }) => 
            <Text 
                style={[styles.itemList, {color: activeCategorie === item._id ? '#3764A0' : '#716A6A'}]}
                onPress={()=>selectCategorie(item)}
            >
                {item.descripcion}
            </Text>
          }
          keyExtractor={(item) => item._id}
        />
        <Text style={{fontSize: 16, fontFamily: 'Cairo-Bold', color: '#716A6A'}}>MARCAS</Text>
        <FlatList
          horizontal={true}
          data={brand}
          renderItem={({ item }) => 
            <Text 
                style={[styles.itemList, {color: activeBrand === item._id ? '#3764A0' : '#716A6A'}]}
                onPress={()=>selectBrand(item)}
            >
                {item.descripcion}
            </Text>
          }
          keyExtractor={(item) => item._id}
        />
        <Text style={{fontSize: 16, fontFamily: 'Cairo-Bold', color: '#716A6A'}}>PROVEEDORES</Text>
        <FlatList
          horizontal={true}
          data={provider}
          renderItem={({ item }) => 
            <Text 
                style={[styles.itemList, {color: activeProvider === item._id ? '#3764A0' : '#716A6A'}]}
                onPress={()=>selectProvider(item)}
            >
                {item.descripcion}
            </Text>
          }
          keyExtractor={(item) => item._id}
        />
        <View style={{flexDirection: 'row', justifyContent: 'space-around', marginVertical: 15}}>
          <Button text={'Cancelar'} onPress={onClose} />
          <Button text={'Aceptar'} onPress={onClose} />
        </View>
    </ModalContainer>
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
    itemList: {
        padding: 10,
        fontSize: 16, 
        fontFamily: 'Cairo-Regular'
    }
})