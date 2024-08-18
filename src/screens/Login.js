import { StyleSheet, Text, TextInput, View } from 'react-native'
import React, { useState } from 'react'
import { useFormik } from 'formik'
import Button from '../components/Button'
import apiClient from '../utils/client'
import { useAppDispatch, useAppSelector } from '../redux/hook'
import { getUser, setUser } from '../redux/userSlice'
import { setAlert } from '../redux/alertSlice'
import { clearLoading, setLoading } from '../redux/loadingSlice'
import Logo from '../components/Logo'
import useLocalStorage from '../hooks/useLocalStorage'

export default function Login({navigation}) {

    const dispatch = useAppDispatch();
    const user = useAppSelector(getUser);
    const {data: userLocalStorage, saveData, clearData} = useLocalStorage([],'user')

    const formik = useFormik({
        initialValues: {
            nickname: 'sergio',
            password: '123'
        },
        validateOnChange: false,
        onSubmit: (formValue) => {
            dispatch(setLoading({
                message: `Verificando los datos`
            }))
           apiClient.post(`/auth/login`, formValue)
            .then(async function(response){
                console.log(response.data)
                if( response.data === 'NOT_FOUND_USER' || response.data ==='PASSWORD_INCORRECT'){
                    console.log('error', response.data)
                    dispatch(setAlert({
                        message: `${response.data}`,
                        type: 'error'
                    }))
                    dispatch(clearLoading())
                    return
                }
                dispatch(setUser(response.data))
                dispatch(setAlert({
                    message: `Bienvenido ${response.data.user}`,
                    type: 'success'
                }))
                await saveData(response.data)
                dispatch(clearLoading())
                formik.resetForm()
                navigation.navigate('Home')
            })
            .catch(function(error){
                console.log("post ",error);
                dispatch(setAlert({
                    message: `Ocurrio un error`,
                    type: 'error'
                }))
                dispatch(clearLoading())
            }) 
        }
    })

  return (
    <View style={styles.content}>
        <Logo/>
        <View>
            <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginStart: '10%', marginVertical: 5,}}>Usuario</Text>
            <View style={{flexDirection: 'row', justifyContent: 'center'}} >
                <TextInput placeholder={''} style={styles.input}
                    value={formik.values.nickname}
                    onChangeText={(text)=> formik.setFieldValue('nickname', text)}
                />
            </View>
            <Text style={{fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginStart: '10%', marginVertical: 5}}>Contraseña</Text>
            <View style={{flexDirection: 'row', justifyContent: 'center'}} >
                <TextInput placeholder={''} style={styles.input}
                    value={formik.values.password}
                    secureTextEntry={true}
                    onChangeText={(text)=> formik.setFieldValue('password', text)}
                />
            </View>
        </View>
        <View style={{flexDirection: 'row', justifyContent: 'center'}} >
            <Button text={'INGRESAR'} fontSize={16} width={'30%'} style={{marginTop: 15}} onPress={formik.handleSubmit} />
        </View>
    </View>
  )
}

const styles = StyleSheet.create({
    input: {
        margin: 3,
        borderWidth: 1,
        paddingHorizontal: 15,
        borderRadius: 10,
        color: '#7F8487',
        borderColor: '#D9D9D9',
        width: '80%',
        fontSize: 12
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#fff',
        height: '100%'
    }
})