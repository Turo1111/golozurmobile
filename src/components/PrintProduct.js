import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import ModalContainer from './ModalContainer'
import { useAppDispatch, useAppSelector } from '../redux/hook'
import { clearLoading, setLoading } from '../redux/loadingSlice'
import apiClient from '../utils/client'
import Button from './Button'
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Buffer } from 'buffer';
import { getUser } from '../redux/userSlice'
import useLocalStorage from '../hooks/useLocalStorage'

const arrayBufferToBase64 = (buffer) => {
  return Buffer.from(buffer).toString('base64');
};

export default function PrintProduct({open, onClose}) {

    const [categorie, setCategorie] = useState([])
    const [selectCategorie, setSelectCategorie] = useState([{
      _id: 0,
      descripcion: 'Todas'
    }])
    const user = useAppSelector(getUser) 
    const {data: userStorage} = useLocalStorage([],'user')
    const dispatch = useAppDispatch()

    useEffect(()=>{
        const getCategorie = () => {
          dispatch(setLoading(true));
          apiClient.get(`/categorie`)
          .then(function(response){
            console.log(response.data)
            setCategorie(prevData => [{
              _id: 0,
              descripcion: 'Todas'
            }, ...response.data])
            dispatch(clearLoading())
          })
          .catch(function(error){
              console.log("get",error);
              dispatch(clearLoading())
          })
        }
    
        if (open) {
          getCategorie()
        }
    }, [open])

    const downloadAndSharePDF = async () => {
        let filterCategorie = selectCategorie.map(item=>item._id !== 0 && item.descripcion)
        const fileName = `ListaDePrecios.pdf`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        dispatch(setLoading({
          message: `Creando lista de productos`
        }))
        try {
          // Descargar el archivo como ArrayBuffer
          const response = await apiClient.post(`/product/print/print`, {categories: filterCategorie[0] !== false ? filterCategorie : undefined}, { responseType: 'arraybuffer', 
            headers: {
                Authorization: `Bearer ${user.token || userStorage.token}` // Agregar el token en el encabezado como "Bearer {token}"
              },
           });
          const pdfArrayBuffer = response.data;
    
          // Convertir el ArrayBuffer a Base64 usando Buffer
          const pdfBase64 = arrayBufferToBase64(pdfArrayBuffer);
    
          // Guardar el archivo en el sistema de archivos de Expo
          await FileSystem.writeAsStringAsync(fileUri, pdfBase64, {
            encoding: FileSystem.EncodingType.Base64,
          });
    
          // Compartir el archivo utilizando expo-sharing
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'application/pdf',
              dialogTitle: 'Compartir PDF',
              UTI: 'com.adobe.pdf',
            });
            dispatch(clearLoading())
          } else {
            alert('La función de compartir no está disponible en este dispositivo');
            dispatch(clearLoading())
          }
          dispatch(clearLoading())
          onClose()
          setSelectCategorie([{
            _id: 0,
            descripcion: 'Todas'
          }])
        } catch (error) {
          console.error('Error descargando o compartiendo el PDF:', error);
          dispatch(clearLoading())
        }
      };
    
    
  return (
    <View>
      <ModalContainer
        openModal={open}
        onClose={onClose}
        header={true}
        title='Imprimir productos'
        height={'auto'}
      >
        <ScrollView style={{display: 'flex', maxHeight: '75%'}} >
        {
            categorie.map((item, index)=>{
            let isActive = selectCategorie.find(elem=>elem._id === item._id) ? true : false
            return <Text
                key={index} style={[styles.item, {
                    color: `${isActive ? '#fff' : 'black'}`,
                    backgroundColor: `${isActive ? '#3764A0' : '#fff'}`
                }]}
                onPress={()=>{
                setSelectCategorie((prevData)=>{
                  if (item._id !== 0) {
                    let clearPrev = prevData.filter((itemPrev)=>itemPrev._id !== 0 && itemPrev._id !== item._id)
                    return [...clearPrev, item]
                  }
                  return [item]
                  
                })
              }}
            >{item.descripcion}</Text>})
        }
        </ScrollView>
        <View style={{marginTop: 15, flexDirection: 'row', justifyContent: 'center'}} >
            <Button text={'IMPRIMIR'} onPress={downloadAndSharePDF} />
        </View>
      </ModalContainer>
    </View>
  )
}

const styles = StyleSheet.create({
    item: {
        paddingHorizontal: 5,
        paddingVertical: 5,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: '#d9d9d9',
        margin: 5,
        borderRadius: 5,
        textAlign: 'center'
    }
})