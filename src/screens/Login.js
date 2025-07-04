import { StyleSheet, Text, TextInput, View, ImageBackground, KeyboardAvoidingView, Platform, TouchableOpacity, Image } from 'react-native'
import React, { useState, useEffect } from 'react'
import { useFormik } from 'formik'
import Button from '../components/Button'
import apiClient from '../utils/client'
import { useAppDispatch, useAppSelector } from '../redux/hook'
import { getUser, setUser } from '../redux/userSlice'
import { setAlert } from '../redux/alertSlice'
import { clearLoading, setLoading } from '../redux/loadingSlice'
import Logo from '../components/Logo'
import useLocalStorage from '../hooks/useLocalStorage'
import { LinearGradient } from 'expo-linear-gradient'
import Icon from 'react-native-vector-icons/Feather'

export default function Login({ navigation }) {
    const dispatch = useAppDispatch();
    const user = useAppSelector(getUser);
    const { data: userLocalStorage, saveData, clearData } = useLocalStorage([], 'user')
    const [secureTextEntry, setSecureTextEntry] = useState(true);

    const formik = useFormik({
        initialValues: {
            nickname: '',
            password: ''
        },
        validateOnChange: false,
        onSubmit: (formValue) => {
            dispatch(setLoading({
                message: `Verificando los datos`
            }))
            console.log("nickname", formValue.nickname.trim().toLowerCase())
            apiClient.post(`/auth/login`, {
                nickname: formValue.nickname.trim().toLowerCase(),
                password: formValue.password.trim()
            })
                .then(async function (response) {
                    if (response.data === 'NOT_FOUND_USER' || response.data === 'PASSWORD_INCORRECT') {
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
                        message: `Bienvenido ${response.data.nickname}`,
                        type: 'success'
                    }))
                    await saveData(response.data)
                    dispatch(clearLoading())
                    formik.resetForm()
                    navigation.navigate('Home')
                })
                .catch(function (error) {
                    console.log("post ", error);
                    dispatch(setAlert({
                        message: `Ocurrio un error`,
                        type: 'error'
                    }))
                    dispatch(clearLoading())
                })
        }
    })

    useEffect(() => {
        const isLogIn = async () => {
            if (userLocalStorage.nickname !== '' && userLocalStorage.token !== '' && userLocalStorage.nickname !== undefined && userLocalStorage.token !== undefined) {
                navigation.navigate('Home')
                return
            }
            return
        }
        if (userLocalStorage !== undefined && userLocalStorage !== '') {
            isLogIn()
        }

    }, [userLocalStorage])

    return (
        <ImageBackground
            source={require('../../assets/deposito.jpg')}
            style={styles.backgroundImage}
            blurRadius={5}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.container}
            >
                <View style={styles.logoContainer}>
                    <Logo />
                </View>

                <LinearGradient
                    colors={['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.95)']}
                    style={styles.formContainer}
                >
                    <View style={styles.welcomeSection}>
                        <Text style={styles.welcomeTitle}>¡Bienvenido!</Text>
                        <Text style={styles.welcomeSubtitle}>Inicia sesión para continuar</Text>
                    </View>

                    <View style={styles.inputContainer}>
                        <View style={styles.inputIconContainer}>
                            <Icon name="user" size={18} color="#7F8487" />
                        </View>
                        <TextInput
                            placeholder="Usuario"
                            style={styles.input}
                            value={formik.values.nickname}
                            onChangeText={(text) => formik.setFieldValue('nickname', text)}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <View style={styles.inputIconContainer}>
                            <Icon name="lock" size={18} color="#7F8487" />
                        </View>
                        <TextInput
                            placeholder="Contraseña"
                            style={styles.input}
                            value={formik.values.password}
                            secureTextEntry={secureTextEntry}
                            onChangeText={(text) => formik.setFieldValue('password', text)}
                        />
                        <TouchableOpacity
                            style={styles.eyeIcon}
                            onPress={() => setSecureTextEntry(!secureTextEntry)}
                        >
                            <Icon name={secureTextEntry ? "eye" : "eye-off"} size={18} color="#7F8487" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={formik.handleSubmit}
                    >
                        <LinearGradient
                            colors={['#6e8c47', '#3b5998']}
                            style={styles.gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.loginButtonText}>INGRESAR</Text>
                            <Icon name="log-in" size={18} color="#fff" style={{ marginLeft: 8 }} />
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Sistema de Gestión Golozur</Text>
                    </View>
                </LinearGradient>
            </KeyboardAvoidingView>
        </ImageBackground>
    )
}

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: '100%',
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        marginBottom: 20,
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
    },
    formContainer: {
        width: '85%',
        borderRadius: 20,
        padding: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    welcomeSection: {
        alignItems: 'center',
        marginBottom: 25,
    },
    welcomeTitle: {
        fontSize: 24,
        fontFamily: 'Cairo-Bold',
        color: '#333',
        marginBottom: 5,
    },
    welcomeSubtitle: {
        fontSize: 14,
        fontFamily: 'Cairo-Regular',
        color: '#7F8487',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D9D9D9',
        borderRadius: 12,
        marginBottom: 16,
        backgroundColor: '#fff',
    },
    inputIconContainer: {
        padding: 12,
        borderRightWidth: 1,
        borderRightColor: '#EFEFEF',
    },
    input: {
        flex: 1,
        padding: 12,
        fontSize: 14,
        fontFamily: 'Cairo-Regular',
        color: '#333',
    },
    eyeIcon: {
        padding: 12,
    },
    loginButton: {
        marginTop: 10,
        borderRadius: 12,
        overflow: 'hidden',
    },
    gradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Cairo-Bold',
    },
    footer: {
        marginTop: 25,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        fontFamily: 'Cairo-Regular',
        color: '#7F8487',
    }
});