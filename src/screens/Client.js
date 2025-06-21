import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import apiClient from '../utils/client'
import { getUser } from '../redux/userSlice';
import { useAppDispatch, useAppSelector } from '../redux/hook';
import { clearLoading, getLoading, setLoading } from '../redux/loadingSlice';
import Search from '../components/Search';
import Button from '../components/Button';
import { useInputValue } from '../hooks/useInputValue'
import { io } from 'socket.io-client';
import useLocalStorage from '../hooks/useLocalStorage';
import useInternetStatus from '../hooks/useInternetStatus';
import { OfflineContext } from '../context.js/contextOffline';
import useFilteredArray from '../hooks/useFilteredArray';
import { setAlert } from '../redux/alertSlice';
import usePermissionCheck from '../hooks/usePermissionCheck';
import { MaterialIcons } from '@expo/vector-icons';

const renderClientItem = ({ item, navigation, isConnected }) => {
    return (
        <Pressable style={styles.item} onPress={() => {
            /* if (!isConnected) {
                return
            }
            navigation.navigate('DetailsClient', {
                id: item._id,
                name: item.nombreCompleto,
            }) */
        }}>
            <View>
                <Text style={styles.titleClient}>{item.nombreCompleto}</Text>
                <Text style={{ fontSize: 14, color: '#7F8487' }}>Ciudad: {item.ciudad?.descripcion || 'Sin ciudad'}</Text>
                {item.direccion && (
                    <Text style={{ fontSize: 14, color: '#7F8487' }}>Dirección: {item.direccion}</Text>
                )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View>
                    {item.telefonos && item.telefonos.length > 0 && (
                        <Text style={{ fontSize: 14, color: '#799351', marginLeft: 10, fontWeight: '500' }}>
                            Tel: {item.telefonos[0]}
                        </Text>
                    )}
                </View>
                <Pressable
                    style={{ marginLeft: 10 }}
                    onPress={() => navigation.navigate('EditClient', { id: item._id, name: item.nombreCompleto })}
                >
                    <MaterialIcons name="edit" size={24} color="#799351" />
                </Pressable>
            </View>
        </Pressable>
    );
}

export default function Client({ navigation }) {
    const user = useAppSelector(getUser)
    const { data: userStorage } = useLocalStorage([], 'user')
    const loading = useAppSelector(getLoading)
    const dispatch = useAppDispatch();
    const [data, setData] = useState([])
    const [dataSearch, setDataSearch] = useState([])
    const [query, setQuery] = useState({ skip: 0, limit: 15 })
    const isConnected = useInternetStatus();
    const search = useInputValue('', '')
    const { offline } = useContext(OfflineContext)

    const { hasPermission: hasPermissionReadClient, isLoading: isLoadingReadClient } = usePermissionCheck('read_client', () => { })
    const { hasPermission: hasPermissionCreateClient, isLoading: isLoadingCreateClient } = usePermissionCheck('create_client', () => { })

    const getClients = (skip, limit) => {
        dispatch(setLoading({
            message: `Actualizando clientes`
        }))
        apiClient.post(`/client/skip`, { skip, limit },
            {
                headers: {
                    Authorization: `Bearer ${user.token || userStorage.token}`
                },
            })
            .then(response => {
                setData((prevData) => {
                    if (prevData) {
                        if (prevData.length === 0) {
                            console.log('prevData', prevData)
                            return response.data
                        }
                        const newData = response.data.filter((element) => {
                            return prevData.findIndex((item) => item._id === element._id) === -1;
                        });
                        return [...prevData, ...newData];
                    }
                    return []
                })
                dispatch(clearLoading())
            })
            .catch(e => {
                console.log("error", e);
                console.log('error client', e.response?.data)
                dispatch(setAlert({
                    message: `${e.response?.data || 'Ocurrio un error'}`,
                    type: 'error'
                }))
                dispatch(clearLoading())
            })
    }

    const getClientsSearch = (input) => {
        apiClient.post(`/client/search`, { input },
            {
                headers: {
                    Authorization: `Bearer ${user.token || userStorage.token}`
                },
            }
        )
            .then(response => {
                setDataSearch(response.data)
            })
            .catch(e => {
                console.log("error", e);
                dispatch(setAlert({
                    message: `${e.response?.data || 'Ocurrio un error'}`,
                    type: 'error'
                }))
                dispatch(clearLoading())
            })
    }

    useEffect(() => {
        if (!offline) {
            getClients(query.skip, query.limit)
        }
    }, [query, offline, user.token, userStorage.token])

    useEffect(() => {
        if (search && !offline) {
            getClientsSearch(search.value)
        }
    }, [search.value])

    useEffect(() => {
        const socket = io('http://10.0.2.2:5000')
        socket.on('client', (socket) => {
            /* refreshClients() */
            setData((prevData) => {
                const exist = prevData.find((elem) => elem._id === socket.data._id)
                if (exist) {
                    return prevData.map((item) =>
                        item._id === socket.data._id ? socket.data : item
                    )
                }
                return [...prevData, { ...socket.data, _id: Math.floor(Math.random() * 1000000) }]
            })
        })
        return () => {
            socket.disconnect();
        };
    }, [data])

    const refreshClients = () => {
        search.clearValue()
        /* if (!offline) {
            getClients(query.skip, query.limit)
        } */
    };

    /* useEffect(() => {
        console.log('data', data)
    }, [data]) */

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            refreshClients()
        });

        return unsubscribe
    }, [navigation]);

    if (isLoadingReadClient || !hasPermissionReadClient) {
        return null
    }

    return (
        <View>
            {
                !offline ?
                    <View>
                        <Search placeholder={'Buscar cliente'} searchInput={search} />
                        <View style={{ paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', margin: 15 }} >
                            {hasPermissionCreateClient && (
                                <Button text={'Nuevo Cliente'} fontSize={14} width={'40%'} onPress={() => { navigation.navigate('NewClient') }} />
                            )}
                        </View>
                        <Text style={{ fontSize: 18, fontFamily: 'Cairo-Regular', color: '#799351', paddingHorizontal: 15 }} >Estas en modo con conexion</Text>
                        <FlatList
                            style={{ height: '83%' }}
                            data={search.value !== '' ? dataSearch : data}
                            renderItem={({ item }) => renderClientItem({ item, navigation, isConnected })}
                            keyExtractor={(item) => item._id}
                            onEndReached={() => {
                                if (!loading.open) {
                                    if (search) {
                                        if (search.value === '') {
                                            dispatch(setLoading({
                                                message: `Cargando nuevos clientes`
                                            }))
                                            setQuery({ skip: query.skip + 15, limit: query.limit })
                                        }
                                    }
                                }
                            }}
                        />
                    </View>
                    :
                    <View>
                        <Search placeholder={'Buscar cliente'} searchInput={search} />
                        <Text style={{ fontSize: 18, fontFamily: 'Cairo-Regular', color: '#C7253E', paddingHorizontal: 15 }} >Estas en modo sin conexion</Text>
                        <FlatList
                            style={{ height: '83%' }}
                            data={filteredArray}
                            renderItem={({ item }) => renderClientItem({ item, navigation, isConnected })}
                            keyExtractor={(item) => item._id}
                        />
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
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    titleClient: {
        fontSize: 18,
        fontFamily: 'Cairo-Bold',
        color: '#252525'
    },
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center'
    }
});
