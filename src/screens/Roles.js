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

const renderRoleItem = ({ item, navigation, isConnected }) => {
    return (
        <Pressable style={styles.item} onPress={() => {
            if (item.name === 'admin') {
                return
            }
            if (!isConnected) {
                return
            }
            navigation.navigate('EditRole', {
                id: item._id,
                name: item.name,
            })
        }}>
            <View>
                <Text style={styles.titleRole}>{item.name}</Text>
                <Text style={{ fontSize: 14, color: '#7F8487' }}>{item.description}</Text>
            </View>
            <View>
                <Text style={{ fontSize: 18, color: '#FA9B50', fontFamily: 'Cairo-Bold' }}>{item.permissions?.length || 0} permisos</Text>
            </View>
        </Pressable>
    );
}

export default function Roles({ navigation }) {
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

    const { hasPermission: hasPermissionReadRole, isLoading: isLoadingReadRole } = usePermissionCheck('read_role', () => { })
    const { hasPermission: hasPermissionCreateRole, isLoading: isLoadingCreateRole } = usePermissionCheck('create_role', () => { })

    const getRoles = (skip, limit) => {
        dispatch(setLoading({
            message: `Actualizando roles`
        }))
        apiClient.post(`/role/skip`, { skip, limit },
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
                dispatch(setAlert({
                    message: `${e.response?.data || 'Ocurrio un error'}`,
                    type: 'error'
                }))
                dispatch(clearLoading())
            })
    }

    const getRolesSearch = (input) => {
        apiClient.post(`/role/search`, { input },
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
            getRoles(query.skip, query.limit)
        }
    }, [query, offline, user.token, userStorage.token])

    useEffect(() => {
        if (search) {
            getRolesSearch(search.value)
        }
    }, [search.value])

    useEffect(() => {
        const socket = io('http://10.0.2.2:5000')
        socket.on(`role`, (socketData) => {
            refreshRoles()
            setData((prevData) => {
                const exist = prevData.find((elem) => elem._id === socketData.data._id)
                if (exist) {
                    return prevData.map((item) =>
                        item._id === socketData.data._id ? socketData.data : item
                    )
                }
                return [...prevData, { ...socketData.data, _id: Math.floor(Math.random() * 1000000) }]
            })
        })
        return () => {
            socket.disconnect();
        };
    }, [data])

    const refreshRoles = () => {
        search.clearValue()
        /* if (!offline) {
            getRoles(query.skip, query.limit)
        } */
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            refreshRoles()
        });

        return unsubscribe
    }, [navigation]);

    if (isLoadingReadRole || !hasPermissionReadRole) {
        return null
    }

    return (
        <View>
            {offline ? (
                <View>
                    <Text>Estas en modo sin conexion</Text>
                </View>
            ) : (
                <View>
                    <Search placeholder={'Buscar rol'} searchInput={search} />
                    <View style={{ paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', margin: 15 }} >
                        {hasPermissionCreateRole && (
                            <Button text={'Nuevo Rol'} fontSize={14} width={'40%'} onPress={() => { navigation.navigate('NewRole') }} />
                        )}
                    </View>
                    <Text style={{ fontSize: 18, fontFamily: 'Cairo-Regular', color: '#799351', paddingHorizontal: 15 }} >Estas en modo con conexion</Text>
                    <FlatList
                        style={{ height: '83%' }}
                        ListEmptyComponent={() => {
                            return (
                                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 16, fontFamily: 'Cairo-Regular', color: '#666' }}>No hay roles disponibles</Text>
                                </View>
                            )
                        }}
                        data={search.value !== '' ? dataSearch : data}
                        renderItem={({ item }) => renderRoleItem({ item, navigation, isConnected })}
                        keyExtractor={(item) => item._id}
                        onEndReached={() => {
                            if (!loading.open) {
                                if (search) {
                                    if (search.value === '') {
                                        dispatch(setLoading({
                                            message: `Cargando nuevos roles`
                                        }))
                                        setQuery({ skip: query.skip + 15, limit: query.limit })
                                    }
                                }
                            }
                        }}
                    />
                </View>
            )}
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
    titleRole: {
        fontSize: 18,
        fontFamily: 'Cairo-Bold',
        color: '#252525'
    }
}); 