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

const renderUserItem = ({ item, navigation, isConnected }) => {
    return (
        <Pressable style={styles.item} onPress={() => {
            if (!isConnected) {
                return
            }
            navigation.navigate('DetailsUser', {
                id: item._id,
                name: item.nickname,
            })
        }}>
            <View>
                <Text style={styles.titleUser}>{item.nickname}</Text>
                <Text style={{ fontSize: 14, color: '#7F8487' }}>Ventas: {item.qtySaleUser || 0}</Text>
            </View>
            <View>
                <Text style={{ fontSize: 18, color: '#FA9B50', fontFamily: 'Cairo-Bold' }}>{item.nameRole || 'Sin rol'}</Text>
                <Text style={{ fontSize: 14, color: '#799351', marginLeft: 10, fontWeight: '500' }}>Ganancia: ${item.gain || 0}</Text>
            </View>
        </Pressable>
    );
}

export default function Users({ navigation }) {
    const user = useAppSelector(getUser)
    const { data: userStorage } = useLocalStorage([], 'user')
    const loading = useAppSelector(getLoading)
    const dispatch = useAppDispatch();
    const [data, setData] = useState([])
    const [dataSearch, setDataSearch] = useState([])
    const [query, setQuery] = useState({ skip: 0, limit: 15 })
    const isConnected = useInternetStatus();
    const { data: userLocalStorage } = useLocalStorage([], 'userStorage')
    const search = useInputValue('', '')
    const filteredArray = useFilteredArray(userLocalStorage, search.value);
    const { offline } = useContext(OfflineContext)
    const { data: offlineStorage } = useLocalStorage(true, 'offlineStorage')

    const getUsers = (skip, limit) => {
        dispatch(setLoading({
            message: `Actualizando usuarios`
        }))
        apiClient.post(`/user/skip`, { skip, limit },
            {
                headers: {
                    Authorization: `Bearer ${user.token || userStorage.token}`
                },
            })
            .then(response => {
                setData((prevData) => {
                    if (prevData) {
                        if (prevData.length === 0) {
                            return response.data.array
                        }
                        const newData = response.data.array.filter((element) => {
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
                dispatch(clearLoading())
            })
    }

    const getUsersSearch = (input) => {
        apiClient.post(`/user/search`, { input },
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
                dispatch(clearLoading())
            })
    }

    useEffect(() => {
        if (!offlineStorage) {
            getUsers(query.skip, query.limit)
        }
    }, [query, offlineStorage, user.token, userStorage.token])

    useEffect(() => {
        if (search && !offlineStorage) {
            getUsersSearch(search.value)
        }
    }, [search.value])

    useEffect(() => {
        const socket = io('http://10.0.2.2:5000')
        socket.on('user', (socket) => {
            console.log("escucho user", socket)
            /* refreshUsers() */
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

    const refreshUsers = () => {
        search.clearValue()
        if (!offlineStorage) {
            getUsers(query.skip, query.limit)
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            refreshUsers()
        });

        return unsubscribe
    }, [navigation]);

    return (
        <View>
            {
                !offlineStorage ?
                    <View>
                        <Search placeholder={'Buscar usuario'} searchInput={search} />
                        <View style={{ paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', margin: 15 }} >
                            <Button text={'Nuevo Usuario'} fontSize={14} width={'40%'} onPress={() => { navigation.navigate('NewUser') }} />
                        </View>
                        <Text style={{ fontSize: 18, fontFamily: 'Cairo-Regular', color: '#799351', paddingHorizontal: 15 }} >Estas en modo con conexion</Text>
                        <FlatList
                            style={{ height: '83%' }}
                            data={search.value !== '' ? dataSearch : data}
                            renderItem={({ item }) => renderUserItem({ item, navigation, isConnected })}
                            keyExtractor={(item) => item._id}
                            onEndReached={() => {
                                if (!loading.open) {
                                    if (search) {
                                        if (search.value === '') {
                                            dispatch(setLoading({
                                                message: `Cargando nuevos usuarios`
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
                        <Search placeholder={'Buscar usuario'} searchInput={search} />
                        <Text style={{ fontSize: 18, fontFamily: 'Cairo-Regular', color: '#C7253E', paddingHorizontal: 15 }} >Estas en modo sin conexion</Text>
                        <FlatList
                            style={{ height: '83%' }}
                            data={filteredArray}
                            renderItem={({ item }) => renderUserItem({ item, navigation, isConnected })}
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
    titleUser: {
        fontSize: 18,
        fontFamily: 'Cairo-Bold',
        color: '#252525'
    },
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center'
    }
});
