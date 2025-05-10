import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
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
    const [selectedOption, setSelectedOption] = useState('normal');
    const [discountPercentage, setDiscountPercentage] = useState(0);
    const [categoriaEstado, setCategoriaEstado] = useState({
      conDescuento: [],
      sinDescuento: []
    })

    const handleCategoriaEstado = (item) => {
      const isInConDescuento = categoriaEstado.conDescuento.find(elem => elem._id === item._id);
      const isInSinDescuento = categoriaEstado.sinDescuento.find(elem => elem._id === item._id);

      if (isInConDescuento) {
        setCategoriaEstado(prev => ({
          ...prev,
          conDescuento: prev.conDescuento.filter(elem => elem._id !== item._id),
          sinDescuento: [...prev.sinDescuento, item]
        }));
      } else if (isInSinDescuento) {
        setCategoriaEstado(prev => ({
          ...prev,
          sinDescuento: prev.sinDescuento.filter(elem => elem._id !== item._id)
        }));
      } else {
        setCategoriaEstado(prev => ({
          ...prev,
          conDescuento: [...prev.conDescuento, item]
        }));
      }
    }

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

    const printApplyDiscount = async () => {
      console.log(categoriaEstado)
      console.log(discountPercentage/100)
      /* return */
      if(categoriaEstado.conDescuento.length === 0 && categoriaEstado.sinDescuento.length === 0){
        alert('No hay categorías seleccionadas')
        return
      }
      if(discountPercentage === 0){
        alert('No hay descuento seleccionado')
        return
      }
      const fileName = `ListaDePrecios.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      dispatch(setLoading({
        message: `Creando lista de productos`
      }))
      try {
        const response = await apiClient.post('/product/print/print-with-discount', 
          {
            categories: categoriaEstado,
            discount: discountPercentage/100
          },
          { responseType: 'arraybuffer', 
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
          setCategoriaEstado({
            conDescuento: [],
            sinDescuento: []
          })
          setDiscountPercentage(0)
      } catch (error) {
        console.log(error)
        dispatch(clearLoading())
      }
    }

    const downloadAndSharePDF = async () => {
      if(selectedOption === 'porcentaje'){
        printApplyDiscount()
        return
      }

        let filterCategorie = selectCategorie.map(item=>item._id !== 0 && item.descripcion)
        const fileName = `ListaDePrecios.pdf`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        dispatch(setLoading({
          message: `Creando lista de productos`
        }))
        try {
          // Descargar el archivo como ArrayBuffer
          const response = await apiClient.post(`/product/print/print`, {categories: filterCategorie[0] !== false ? filterCategorie : undefined, isPrecioUnitario: true}, { responseType: 'arraybuffer', 
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
        <View style={{marginTop: 10}}>
          <View style={styles.radioGroup}>
            <TouchableOpacity 
              style={styles.radioButton}
              onPress={() => setSelectedOption('normal')}
            >
              <View style={styles.radio}>
                {selectedOption === 'normal' && (
                  <View style={styles.radioInner} />
                )}
              </View>
              <Text style={styles.radioText}>Precios normales</Text>
            </TouchableOpacity> 
            <TouchableOpacity
              style={styles.radioButton}
              onPress={() => setSelectedOption('descuento')}
            >
              <View style={styles.radio}>
                {selectedOption === 'descuento' && (
                  <View style={styles.radioInner} />
                )}
              </View>
              <Text style={styles.radioText}>Precios con descuento</Text>
            </TouchableOpacity> 
            <TouchableOpacity
              style={styles.radioButton}
              onPress={() => setSelectedOption('porcentaje')}
            >
              <View style={styles.radio}>
                {selectedOption === 'porcentaje' && (
                  <View style={styles.radioInner} />
                )}
              </View>
              <Text style={styles.radioText}>Precios aplicando descuentos</Text>
            </TouchableOpacity>
          </View>
          {
            (selectedOption === 'normal' || selectedOption === 'descuento') &&
            <View style={{display: 'flex', flexDirection: 'column'}}>
              <Text style={{fontSize: 12, color: 'gray', marginTop: 10}}>
                Seleccione las categorías que desea imprimir
              </Text>
              <ScrollView style={{display: 'flex', height: 300}} >
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
                        console.log(item)
                        if (item._id !== 0) {
                          let clearPrev = prevData.filter((itemPrev)=>itemPrev._id === item._id)
                          return [...clearPrev, item]
                        }
                        return [item]

                      })
                    }}
                  >{item.descripcion}</Text>})
                }
              </ScrollView>
            </View>
          }
          {
            selectedOption === 'porcentaje' &&
            <View style={{display: 'flex', flexDirection: 'column'}}>
              <Text style={{fontSize: 12, color: 'gray', marginTop: 10}}>
                Seleccione el porcentaje de descuento
              </Text>
              <View style={{marginTop: 10}}>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#d9d9d9',
                    borderRadius: 5,
                    padding: 10,
                    fontSize: 16
                  }}
                  keyboardType="numeric"
                  placeholder="Ingrese el porcentaje de descuento"
                  value={discountPercentage}
                  onChangeText={(text) => setDiscountPercentage(text)}
                />
              </View>
              <View style={{display: 'flex', flexDirection: 'column'}}>
              <Text style={{fontSize: 12, color: 'gray', marginTop: 10}}>
                Categorias en verde se aplica el descuento, en azul con precio normal
              </Text>
              <ScrollView style={{display: 'flex', height: 300}} >
                {
                  categorie.map((item, index)=>{
                    if(item._id === 0) return null

                  let isDescuento = categoriaEstado.conDescuento.find(elem=>elem._id === item._id) ? true : false
                  let isNormal = categoriaEstado.sinDescuento.find(elem=>elem._id === item._id) ? true : false

                  return <Text
                      key={index} style={[styles.item, {
                          color: `${isDescuento ? '#fff' : isNormal ? '#fff' : 'black'}`,
                          backgroundColor: `${isDescuento ? '#BBD8A3' : isNormal ? '#3764A0' : '#fff'}`
                      }]}
                      onPress={()=>handleCategoriaEstado(item)}
                  >{item.descripcion}</Text>})
                }
              </ScrollView>
            </View>
            </View>
          }
        </View>
        <View style={{flexDirection: 'row', justifyContent: 'center'}} >
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
    },
    radioGroup: {
        flexDirection: 'column',
        gap: 10,
    },
    radioButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
    },
    radio: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: '#ddd',
        backgroundColor: '#fff',
        marginRight: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#F87DA9',
    },
    radioText: {
        color: '#666',
        fontSize: 16,
    }
})