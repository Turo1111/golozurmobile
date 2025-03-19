import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import Button from '../components/Button'
import { useFormik } from 'formik'
import InputSelectAdd from '../components/InputSelectAdd'
import apiClient from '../utils/client'
import { useAppDispatch, useAppSelector } from '../redux/hook'
import { getUser } from '../redux/userSlice'
import { clearLoading, getLoading, setLoading } from '../redux/loadingSlice'
import { setAlert } from '../redux/alertSlice'
import { io } from 'socket.io-client'
import useLocalStorage from '../hooks/useLocalStorage'

export default function EditProduct({ route, navigation}) {

    const { id, details } = route.params;
    const user = useAppSelector(getUser) 
    const {data: userStorage} = useLocalStorage([],'user')
    const loading = useAppSelector(getLoading)
    const dispatch = useAppDispatch();

    const formik = useFormik({
        initialValues: initialValues(details),
        validateOnChange: false,
        onSubmit: (formValue) => {
          /* console.log("formvalue",formValue)
          return */
          if (formValue.descripcion === '' || formValue.stock <= 0 || formValue.precioUnitario <= 0){
            dispatch(setAlert({
              message: `Falta descripcion o stock o precio unitario `,
              type: 'warning'
            }))
            return
          }
          if (formValue.categoria === '' || formValue.proveedor === '' || formValue.marca === ''){
            dispatch(setAlert({
              message: `Falta categoria o proveedor o marca `,
              type: 'warning'
            }))
            return
          }
           dispatch(setLoading({
                message: `Cargando nuevos productos`
            }))
           apiClient.patch(`/product/${id}`, formValue,
            {
              headers: {
                Authorization: `Bearer ${user.token || userStorage.token}` // Agregar el token en el encabezado como "Bearer {token}"
              }
            })
            .then(async (r)=>{
              dispatch(setAlert({
                message: `Producto modificado correctamente`,
                type: 'success'
              }))
              dispatch(clearLoading())
              navigation.navigate('Product')
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

    useEffect(()=>{
      const socket = io('http://10.0.2.2:3002')
      socket.on(`/product`, (socket) => {
        console.log("socket", socket)
        setDetails((prevData)=>{
          if (socket.data._id === id) {
            return socket.data
          }
          return prevData
        })
      })
      return () => {
        socket.disconnect();
      }; 
    },[id])

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
                    onChangeText={(text)=> formik.setFieldValue('stock', text)}
                />
                {/* <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginTop: 5}}>Codigo de barra</Text>
                <TextInput placeholder={'Codigo de barra'} style={styles.input}
                    value={formik.values.codigoBarra}
                    onChangeText={(text)=> formik.setFieldValue('codigoBarra', text)}
                /> */}
                <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginTop: 5}}>Sabor</Text>
                <TextInput placeholder={'Sabor'} style={styles.input}
                    value={formik.values.sabor}
                    onChangeText={(text)=> formik.setFieldValue('sabor', text)}
                />
                <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginTop: 5}}>Categoria</Text>
                <InputSelectAdd
                    value={formik.values.NameCategoria}
                    onChange={(id, item)=>{
                      formik.setFieldValue('categoria', id)
                      formik.setFieldValue('NameCategoria', item.descripcion)
                    }}
                    name={'Categoria'} path={'categorie'}
                />
                <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginTop: 5}}>Marca</Text>
                <InputSelectAdd
                    value={formik.values.NameMarca}
                    onChange={(id, item)=>{
                      formik.setFieldValue('marca', id)
                      formik.setFieldValue('NameMarca', item.descripcion)
                    }}
                    name={'Marca'} path={'brand'}
                />
                <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginTop: 5}}>Proveedor</Text>
                <InputSelectAdd
                    value={formik.values.NameProveedor}
                    onChange={(id, item)=>{
                      formik.setFieldValue('proveedor', id)
                      formik.setFieldValue('NameProveedor', item.descripcion)
                    }}
                    name={'Proveedor'} path={'provider'}
                />
                {/* <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginTop: 5}}>Bulto</Text>
                <TextInput placeholder={'Bulto'} style={styles.input}
                    value={formik.values.bulto}
                    onChangeText={(text)=> formik.setFieldValue('bulto', text)}
                />
                <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginTop: 5}}>Precio del bulto</Text>
                <TextInput placeholder={'Precio del bulto'} style={styles.input}
                    value={formik.values.precioBulto}
                    onChangeText={(text)=> formik.setFieldValue('precioBulto', text)}
                /> */}
                <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginTop: 5}}>Precio de compra</Text>
                <TextInput placeholder={'Precio de compra'} style={styles.input}
                    value={formik.values.precioCompra}
                    onChangeText={(text)=> formik.setFieldValue('precioCompra', text)}
                />
                <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginTop: 5}}>Precio unitario</Text>
                <TextInput placeholder={'Precio unitario'} style={styles.input}
                    value={formik.values.precioUnitario}
                    onChangeText={(text)=> formik.setFieldValue('precioUnitario', text)}
                />
                <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginTop: 5}}>Precio descuento</Text>
                <TextInput placeholder={'Precio descuento'} style={styles.input}
                    value={formik.values.precioDescuento}
                    onChangeText={(text)=> formik.setFieldValue('precioDescuento', text)}
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
    }
})

function initialValues(item) {
    return {
        _id: item?._id || "",
        descripcion: item?.descripcion || "",
        codigoBarra: item?.codigoBarra || "",
        stock: (item?.stock)?.toString() || 0,
        bulto: item?.bulto !== undefined ? (item?.bulto)?.toString() : 0,
        peso: {
            cantidad: item?.peso?.cantidad !== undefined ? (item?.peso?.cantidad).toString() : 0,
            unidad: item?.peso?.unidad !== undefined ? item?.peso?.unidad : "unidad"
        },
        categoria: item?.categoria || '',
        marca: item?.marca || '',
        proveedor: item?.proveedor || '',
        NameCategoria: item?.NameCategoria || '',
        NameMarca: item?.NameMarca || '',
        NameProveedor: item?.NameProveedor || '',
        sabor: item?.sabor || '',
        precioBulto: item?.precioBulto !== undefined ? (item?.precioBulto)?.toString() : 0,
        precioCompra: item?.precioCompra !== undefined ? (item?.precioCompra)?.toString() : 0,
        precioUnitario: item?.precioUnitario !== undefined ?  (item?.precioUnitario)?.toString() : 0,
        precioDescuento: item?.precioDescuento !== undefined ?  (item?.precioDescuento)?.toString() : 0
    }
}