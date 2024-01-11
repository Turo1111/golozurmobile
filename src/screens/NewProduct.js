import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import React, { useState } from 'react'
import Button from '../components/Button'
import { useFormik } from 'formik'
import InputSelectAdd from '../components/InputSelectAdd'
import apiClient from '../utils/client'
import { useAppDispatch, useAppSelector } from '../redux/hook'
import { getUser } from '../redux/userSlice'
import { clearLoading, getLoading, setLoading } from '../redux/loadingSlice'
import { setAlert } from '../redux/alertSlice'
import ChooseFile from '../components/ChooseFile'
import * as FileSystem from 'expo-file-system';

export default function NewProduct({navigation}) {

    const user = useAppSelector(getUser)
    const loading = useAppSelector(getLoading)
    const dispatch = useAppDispatch();

    const formik = useFormik({
        initialValues: {
            descripcion: '',
            stock: 0,
            codigoBarra: '',
            sabor: '',
            categoria: '',
            NameCategoria: '',
            marca: '',
            proveedor: '',
            bulto: 0,
            precioBulto: 0,
            precioCompra: 0,
            precioUnitario: 0
        },
        validateOnChange: false,
        onSubmit: async (formValue) => {
          console.log(formValue)
           if (formValue.descripcion === '' || formValue.stock <= 0 || formValue.precioUnitario <= 0){
              console.log('entre aqui');
              dispatch(setAlert({
                message: `Falta descripcion o stock o precio unitario`,
                type: 'warning'
              }))
              return
            }
            if (formValue.categoria === '' || formValue.proveedor === '' || formValue.marca === ''){
              dispatch(setAlert({
                message: `Falta categoria o proveedor o precio marca `,
                type: 'warning'
              }))
              return
            }
          dispatch(setLoading({
              message: `Cargando nuevos productos`
          }))
          apiClient.post(`/product`, formValue,
            {
              headers: {
                Authorization: `Bearer ${user.token}`
              }
            })
            .then((r)=>{
              dispatch(setAlert({
                message: `Producto creada correctamente`,
                type: 'success'
              }))
              dispatch(clearLoading())
              navigation.goBack()
            })
            .catch(e=>{
                console.log('error', e);
                dispatch(clearLoading())
              dispatch(setAlert({
              message: `${e.response.data.error || 'Ocurrio un error'}`,
              type: 'error'
            }))}) 
        }
    })

  return (
    <View style={{width: '100%', height: '100%'}}>
        <ScrollView>
            <View style={{flex: 1, flexDirection: 'column', justifyContent: 'center', paddingHorizontal: 25}} >
            <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginTop: 5}}>Descripcion</Text>
                <TextInput placeholder={'Descripcion'} style={styles.input}
                    value={formik.values.descripcion}
                    onChangeText={(text)=> formik.setFieldValue('descripcion', text)}
                />
                <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginTop: 5}}>Stock</Text>
                <TextInput placeholder={'Stock'} style={styles.input}
                    value={formik.values.stock}
                    onChangeText={(text)=> {
                      if (!isNaN(text)) { 
                        formik.setFieldValue('stock', text)
                      } 
                    }}
                    inputMode='numeric'
                />
                <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginTop: 5}}>Precio unitario</Text>
                <TextInput placeholder={'Precio unitario'} style={styles.input}
                    value={formik.values.precioUnitario}
                    onChangeText={(text)=> {
                      if (!isNaN(text)) { 
                        formik.setFieldValue('precioUnitario', text)
                      } 
                    }}
                    inputMode='numeric'
                />
                <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginTop: 5}}>Categoria</Text>
                <InputSelectAdd
                    value={formik.values.categoria}
                    onChange={(id, item)=>{
                      formik.setFieldValue('categoria', id)
                      formik.setFieldValue('NameCategoria', item.descripcion)
                    }}
                    name={'Categoria'} path={'categorie'}
                />
                <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginTop: 5}}>Marca</Text>
                <InputSelectAdd
                    value={formik.values.marca}
                    onChange={(id, item)=>{
                      formik.setFieldValue('marca', id)
                      formik.setFieldValue('NameMarca', item.descripcion)
                    }}
                    name={'Marca'} path={'brand'}
                />
                <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginTop: 5}}>Proveedor</Text>
                <InputSelectAdd
                    value={formik.values.proveedor}
                    onChange={(id, item)=>{
                      formik.setFieldValue('proveedor', id)
                      formik.setFieldValue('NameProveedor', item.descripcion)
                    }}
                    name={'Proveedor'} path={'provider'}
                />
                {/* <ChooseFile onSuccess={(image)=>{
                  console.log(image)
                  formik.setFieldValue('myfile', image)
                }} onError={(error)=>console.log(error)} /> */}
                <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginTop: 5}}>Codigo de barra</Text>
                <TextInput placeholder={'Codigo de barra'} style={styles.input}
                    value={formik.values.codigoBarra}
                    onChangeText={(text)=> formik.setFieldValue('codigoBarra', text)}
                />
                <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginTop: 5}}>Sabor</Text>
                <TextInput placeholder={'Sabor'} style={styles.input}
                    value={formik.values.sabor}
                    onChangeText={(text)=> formik.setFieldValue('sabor', text)}
                />
                <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginTop: 5}}>Bulto</Text>
                <TextInput placeholder={'Bulto'} style={styles.input}
                    value={formik.values.bulto}
                    onChangeText={(text)=> {
                      if (!isNaN(text)) { 
                        formik.setFieldValue('bulto', text)
                      } 
                    }}
                    inputMode='numeric'
                />
                <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginTop: 5}}>Precio del bulto</Text>
                <TextInput placeholder={'Precio del bulto'} style={styles.input}
                    value={formik.values.precioBulto}
                    onChangeText={(text)=> {
                      if (!isNaN(text)) { 
                        formik.setFieldValue('precioBulto', text)
                      } 
                    }}
                    inputMode='numeric'
                />
                <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginTop: 5}}>Precio de compra</Text>
                <TextInput placeholder={'Precio de compra'} style={styles.input}
                    value={formik.values.precioCompra}
                    onChangeText={(text)=> {
                      if (!isNaN(text)) { 
                        formik.setFieldValue('precioCompra', text)
                      } 
                    }}
                    inputMode='numeric'
                />
            </View>
        </ScrollView>
        <View style={{flexDirection: 'row', justifyContent: 'space-around', marginVertical: 15}}>
          <Button text={'Cancelar'} onPress={()=>navigation.goBack()} />
          <Button text={'Aceptar'} onPress={formik.handleSubmit} />
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
    choose: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    text: {
      fontSize: 20,
      fontWeight: "bold",
    },
})