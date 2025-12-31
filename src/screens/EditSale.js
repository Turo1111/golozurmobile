import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hook';
import { getUser } from '../redux/userSlice';
import { clearLoading, getLoading, setLoading } from '../redux/loadingSlice';
import { io } from 'socket.io-client';
import { useInputValue } from '../hooks/useInputValue';
import Search from '../components/Search';
import FilterProduct from '../components/FilterProduct';
import apiClient from '../utils/client';
import MyBottomSheet from '../components/MyBottomSheet';
import SliderSale from '../components/SliderSale';
import CartSale from '../components/CartSale';
import ResumeBottomSheet from '../components/ResumeBottomSheet';
import { setAlert } from '../redux/alertSlice';
import useLocalStorage from '../hooks/useLocalStorage';
import useInternetStatus from '../hooks/useInternetStatus';
import { OfflineContext } from '../context.js/contextOffline';
import useFilteredArray from '../hooks/useFilteredArray';
import AddProduct from '../components/AddProduct';
import AlertPostSale from '../components/AlertPostSale';
import AlertDeleteItem from '../components/AlertDeleteItem';
import Constants from 'expo-constants';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import usePermissionCheck from '../hooks/usePermissionCheck';
import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DB_HOST = Constants.expoConfig?.extra?.DB_HOST;

const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Los meses van de 0 a 11
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const renderItem = ({ item, navigation, addSelectProduct }) => {
    // Lógica de stock
    let stockLabel = '';
    let stockColor = '';
    if (item.stock === 0) {
        stockLabel = 'Sin Stock';
        stockColor = '#C7253E';
    } else if (item.stock > 0 && item.stock <= 5) {
        stockLabel = `Stock Bajo: ${item.stock}`;
        stockColor = '#FA9B50';
    } else {
        stockLabel = `Stock: ${item.stock}`;
        stockColor = '#4CAF50';
    }
    return (
        <Pressable style={styles.productCard} onPress={() => addSelectProduct(item)}>
            <View style={{ flex: 1 }}>
                <Text style={styles.productTitle}>{item.descripcion}</Text>
                <Text style={styles.productSubtitle}>{`${item.NameCategoria || ''}${item.NameCategoria && item.NameMarca ? ' - ' : ''}${item.NameMarca || ''}`}</Text>
                <View style={styles.productTagsRow}>
                    <View style={[styles.productTag, { backgroundColor: stockColor + '22', borderColor: stockColor }]}>
                        <Text style={{ color: stockColor, fontSize: 12 }}>{stockLabel}</Text>
                    </View>
                    <View style={[styles.productTag, { backgroundColor: '#f3f6fa', borderColor: '#2563eb' }]}>
                        <Text style={{ color: '#2563eb', fontSize: 12 }}>{`ID: ${item.codigo || (item._id ? item._id.slice(-3) : '---')}`}</Text>
                    </View>
                    <View style={[styles.productTag, { backgroundColor: '#fff3cd', borderColor: '#ffc107' }]}>
                        <Text style={{ color: '#ffc107', fontSize: 12 }}>{`Sabor: ${item.sabor || ('---')}`}</Text>
                    </View>
                </View>
            </View>
            <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', minWidth: 80 }}>
                <Text style={styles.productPrice}>{`$${Number(item.precioUnitario).toFixed(2)}`}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(56, 47, 47, 0.05)', borderRadius: 10, padding: 5, marginTop: 20 }}>
                    <Icon name="chevron-right" size={20} color="#b0b0b0" />
                </View>
            </View>
        </Pressable>
    );
}

const HEADER_BLUE = '#2563eb';

export default function EditSale({ navigation, route }) {
    const { id } = route.params;

    const user = useAppSelector(getUser)
    const { data: userStorage } = useLocalStorage([], 'user')
    const loading = useAppSelector(getLoading)
    const dispatch = useAppDispatch();
    const [data, setData] = useState([])
    const [dataSearch, setDataSearch] = useState([])
    const [query, setQuery] = useState({ skip: 0, limit: 15 })
    const [activeCategorie, setActiveCategorie] = useState({ _id: 1, descripcion: 'Todas' })
    const [activeBrand, setActiveBrand] = useState({ _id: 1, descripcion: 'Todas' })
    const [activeProvider, setActiveProvider] = useState({ _id: 1, descripcion: 'Todas' })
    const [openFilter, setOpenFilter] = useState(false)
    const [openBS, setOpenBS] = useState(false)
    const [lineaVenta, setLineaVenta] = useState([])
    const [total, setTotal] = useState(0)
    const [selectProduct, setSelectProduct] = useState(undefined)
    const [openAddProduct, setOpenAddProduct] = useState(false)
    const [openAlertPost, setOpenAlertPost] = useState(false)
    const [openAlertDelete, setOpenAlertDelete] = useState(false)
    const [itemToDelete, setItemToDelete] = useState(null)
    const today = new Date()
    const { updateSale } = useContext(OfflineContext)
    const [saleDetails, setSaleDetails] = useState(null)

    const { hasPermission: hasPermissionEditSale, isLoading: isLoadingEditSale } = usePermissionCheck('update_sale', () => { })

    const cliente = useInputValue('', '')
    const search = useInputValue('', '')
    const porcentaje = useInputValue('0', 'number')

    const [offline, setOffline] = useState(false)

    const { data: productLocalStorage } = useLocalStorage([], 'productStorage')
    const filteredArray = useFilteredArray(productLocalStorage.product, search.value);

    const getSaleDetails = () => {
        console.log("id", id)
        dispatch(setLoading({
            message: `Cargando datos de la venta`
        }))

        apiClient.get(`/sale/${id}`,
            {
                headers: {
                    Authorization: `Bearer ${user.token || userStorage.token}`
                },
            })
            .then(response => {
                setSaleDetails(response.data)
                // Inicializar los valores de la venta existente
                cliente.setValue(response.data.r.cliente || '')
                porcentaje.setValue(response.data.r.porcentaje?.toString() || '0')

                // Cargar los productos de la venta
                if (response.data.itemsSale && response.data.itemsSale.length > 0) {
                    setLineaVenta(response.data.itemsSale)
                }

                dispatch(clearLoading())
            })
            .catch(e => {
                console.log("error", e)
                dispatch(clearLoading())
                dispatch(setAlert({
                    message: `${e.response?.data || 'No se pudieron cargar los datos de la venta'}`,
                    type: 'error'
                }))
                setOffline(true)
            })
    }

    const getProduct = (skip, limit) => {
        apiClient.post(`/product/skip`, { skip, limit },
            {
                headers: {
                    Authorization: `Bearer ${user.token || userStorage.token}` // Agregar el token en el encabezado como "Bearer {token}"
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
                console.log('error', e);
                dispatch(clearLoading())
                dispatch(setAlert({
                    message: `${e.response?.data || 'No se pudo traer los productos, estas en modo offline'}`,
                    type: 'error'
                }))
                setOffline(true)
            })
    }

    const getProductSearch = (input, categorie, brand, provider) => {
        apiClient.post(`/product/search`, { input, categoria: categorie, marca: brand, proveedor: provider })
            .then(response => {
                setDataSearch(response.data)
            })
            .catch(e => {
                console.log("error", e);
                dispatch(setAlert({
                    message: `${e.response?.data || 'No se pudo traer los productos, estas en modo offline'}`,
                    type: 'error'
                }))
                setOffline(true)
            })
    }

    useEffect(() => {
        console.log("id useEffect", id)
        getSaleDetails()
    }, [id])

    useEffect(() => {
        if (!offline) {
            getProduct(query.skip, query.limit)
        }
    }, [query, offline])

    useEffect(() => {
        if (search) {
            getProductSearch(search.value, activeCategorie._id, activeBrand._id, activeProvider._id)
        }
    }, [search.value, activeBrand, activeCategorie, activeProvider])

    useEffect(() => {
        const socket = io(DB_HOST)
        socket.on(`/product`, (socket) => {
            refreshProducts()
        })
        return () => {
            socket.disconnect();
        };
    }, [data])

    const refreshProducts = () => {
        search.clearValue()
        getProduct(query.skip, query.limit)
    };

    useEffect(() => {
        const sumWithInitial = lineaVenta.reduce(
            (accumulator, currentValue) => {
                let suma = parseFloat(accumulator) + parseFloat(currentValue.total)
                if (parseFloat(porcentaje.value) > 0) {
                    return (suma + (suma * (parseFloat(porcentaje.value) / 100)))
                }
                return suma
            },
            0,
        );
        setTotal(prevData => parseFloat(parseFloat(sumWithInitial).toFixed(2)))
    }, [lineaVenta, porcentaje])

    const addCart = (item, cantidad, totalLV, precioUnitario) => {
        setLineaVenta((prevData) => {
            const exist = prevData.find((elem) => elem._id === item._id)
            if (exist) {
                return prevData.map((elem) =>
                    elem._id === item._id ? { ...item, cantidad: cantidad, total: totalLV, precioUnitario: precioUnitario } : elem
                )
            }
            return [...prevData, { ...item, cantidad: cantidad, total: totalLV, idProducto: item._id, precioUnitario: precioUnitario }]
        })
    }

    const addSelectProduct = (item) => {
        setSelectProduct(prevData => item)
        setOpenAddProduct(true)
    }

    const openDeleteModal = (item) => {
        setItemToDelete(item)
        setOpenAlertDelete(true)
    }

    const confirmDeleteItem = () => {
        if (!itemToDelete) {
            setOpenAlertDelete(false)
            return
        }
        dispatch(setLoading({
            message: `Eliminando producto`
        }))
        apiClient.patch(`/itemSale/${itemToDelete._id}`, { estado: false }, {
            headers: {
                Authorization: `Bearer ${user.token || userStorage.token}`
            },
        })
            .then(() => {
                setLineaVenta((prevData) => prevData.filter((elem) => elem._id !== itemToDelete._id))
                setItemToDelete(null)
                setOpenAlertDelete(false)
                dispatch(clearLoading())
            })
            .catch((e) => {
                console.log(e)
                setItemToDelete(null)
                setOpenAlertDelete(false)
                dispatch(clearLoading())
            })
    }

    const updateOffline = async () => {
        let formatToday = new Date().toISOString()
        updateSale(id, { createdAt: formatToday, itemsSale: lineaVenta, cliente: cliente.value, total: total, estado: 'Entregado', porcentaje: porcentaje.value })
        setOpenAlertPost(true)
    }

    const updateSaleData = async () => {
        if (lineaVenta.length === 0 || total <= 0) {
            dispatch(setAlert({
                message: `No se agregaron productos al carrito`,
                type: 'warning'
            }))
            return
        }
        if (cliente.value === '') {
            dispatch(setAlert({
                message: `No se ingreso ningun cliente`,
                type: 'warning'
            }))
            return
        }

        dispatch(setLoading({
            message: `Actualizando venta`
        }))

        apiClient.patch(`/sale/${id}`, {
            itemsSale: lineaVenta,
            cliente: cliente.value,
            total: total,
            estado: 'Entregado',
            porcentaje: porcentaje.value
        }, {
            headers: {
                Authorization: `Bearer ${user.token || userStorage.token}`
            }
        })
            .then((r) => {
                dispatch(clearLoading());
                setOpenAlertPost(true);
            })
            .catch(async (e) => {
                updateOffline()
                dispatch(clearLoading());
            })
    }

    const generatePdf = async (cliente) => {
        let details = undefined;
        if (offline) {
            dispatch(setLoading({
                message: `Obteniendo venta`
            }))
            try {
                const jsonValue = await AsyncStorage.getItem('saleStorage');
                if (jsonValue !== null) {
                    const value = JSON.parse(jsonValue);
                    details = await value.find(elem => elem.cliente === cliente);
                }
                dispatch(clearLoading());
            } catch (e) {
                dispatch(clearLoading());
                dispatch(setAlert({
                    message: 'Hubo un error al obtener la venta',
                    type: 'error'
                }));
            }
        } else {
            await apiClient.get(`/sale/${id}`, {
                headers: {
                    Authorization: `Bearer ${user.token || userStorage.token}`
                },
            })
                .then(r => {
                    details = {
                        itemsSale: r.data.itemsSale,
                        cliente: r.data.r.cliente,
                        total: r.data.r.total,
                        createdAt: r.data.r.createdAt
                    };
                })
                .catch(e => {
                    dispatch(setAlert({
                        message: `${e.response?.data || 'Ocurrio un error'}`,
                        type: 'error'
                    }));
                });
        }

        if (!details) {
            dispatch(setAlert({
                message: 'Ocurrio un error al obtener los detalles de la venta',
                type: 'error'
            }));
            return;
        }

        const chunkArray = (array, size) => {
            const result = [];
            for (let i = 0; i < array.length; i += size) {
                result.push(array.slice(i, i + size));
            }
            return result;
        };

        const itemsChunks = chunkArray(details.itemsSale, 15);

        const generateHtmlContent = (items, chunkIndex, totalChunks) => {
            const itemsText = items.map(item => `
        <div class="it">
          <p class="it">${(item.descripcion).toUpperCase()}</p>
          <div class="itemList">
            <div class="flex">
              <p class="it">${item.cantidad}x</p>
              <p class="it">$${(item.precio || item.precioUnitario).toString().toLocaleString('es-ES')}</p>
            </div>
            <p class="it">$${(item.total).toString().toLocaleString('es-ES')}</p>
          </div>
        </div>
      `).join('');

            return `
        <html>
          <head>
            <style>
              body {
                font-family: 'Courier New', Courier, monospace;
                font-size: 15px;
                margin: 0;
                padding: 0;
              }
              .header {
                margin-left: 5px;
                padding: 0;
              }
              .header h2 {
                text-align: center;
                padding: 0;
                margin-bottom: 5px;
                font-size: 15px;
              }
              .header p {
                padding: 0;
                margin: 0;
                margin-bottom: 2px;
                font-size: 15px;
              }
              .details {
                margin: 0;
                font-size: 15px;
                padding: 0;
              }
              .flex {
                display: flex;
                margin: 0;
                padding: 0;
              }
              .itemList {
                display: flex;
                padding: 0px 3px;
                margin: 0;
                padding: 0;
                justify-content: space-between;
              }
              .it {
                margin: 0;
                padding: 0;
              }
              .total {
                margin: 0;
                font-weight: bold;
                text-align: right;
                font-size: 18px;
                padding: 0;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>GOLOZUR</h2>
              <p>Fecha: ${details.createdAt.split("T")[0]}</p>
              <p>Cliente: ${details.cliente}</p>
              <p>*NO VALIDO COMO FACTURA</p>
              ${totalChunks > 1 ? `<p>Ticket ${chunkIndex + 1} de ${totalChunks}</p>` : ''}
            </div>
            <hr/>
            <div class="details">
              ${itemsText}
            </div>
            <hr/>
            ${chunkIndex === totalChunks - 1 ? `
              <div class="total">
                <p>Total Neto $ ${(details.total).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            ` : ''}
          </body>
        </html>
      `;
        };

        try {
            for (let i = 0; i < itemsChunks.length; i++) {
                const htmlContent = generateHtmlContent(itemsChunks[i], i, itemsChunks.length);
                const { uri } = await Print.printToFileAsync({
                    html: htmlContent,
                    width: 200,  // 57 mm en puntos
                    height: 192.85
                });

                const isAvailable = await Sharing.isAvailableAsync();
                if (isAvailable) {
                    await Sharing.shareAsync(uri);
                } else {
                    console.log('Compartir no disponible en este dispositivo');
                }
            }
        } catch (error) {
            console.error('Error generando el PDF:', error);
        }
    };

    useEffect(() => {
        const socket = io(DB_HOST)
        socket.on(`/sale`, (socket) => {
            // Escuchar actualizaciones de ventas
        })
        return () => {
            socket.disconnect();
        };
    }, [data])

    if (isLoadingEditSale || !hasPermissionEditSale) {
        return null
    }

    return (
        <SafeAreaView style={styles.content}  >
            {/* Header - No modificar */}
            <View style={{ backgroundColor: '#2563eb', borderBottomLeftRadius: 18, borderBottomRightRadius: 18, paddingTop: 50, paddingBottom: 18, paddingHorizontal: 15, elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, marginRight: 10 }}>
                            <Icon name="arrow-left" size={18} color="#fff" />
                        </TouchableOpacity>
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Editar Venta</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.18)', borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 2 }}>
                            <View style={[styles.onlineDot, { backgroundColor: offline ? '#C7253E' : '#4CAF50' }]} />
                            <Text style={{ color: '#fff', fontSize: 13, marginLeft: 4 }}>{offline ? 'Offline' : 'Online'}</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.searchBarContainer}>
                    <Icon name="search" size={18} color="#7F8487" style={{ marginLeft: 10 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar productos, categorías, marcas..."
                        placeholderTextColor="#b0b0b0"
                        {...search}
                    />
                    <TouchableOpacity onPress={() => setOpenFilter(true)} style={{ marginRight: 10 }}>
                        <Icon name="filter" size={18} color="#7F8487" />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                style={{ height: '83%' }}
                data={
                    offline ? filteredArray :
                        (search.value !== '' || activeBrand._id !== 1 || activeCategorie._id !== 1 || activeProvider._id !== 1 ?
                            dataSearch :
                            data)
                }
                renderItem={({ item }) => renderItem({ item, navigation, addSelectProduct })}
                keyExtractor={(item) => item._id}
                onEndReached={() => {
                    if (!loading.open) {
                        if (search) {
                            if (search.value === '') {
                                setQuery({ skip: query.skip + 15, limit: query.limit })
                            }
                        }
                    }
                }}
            />
            <FilterProduct open={openFilter} onClose={() => setOpenFilter(false)} activeBrand={activeBrand._id} activeCategorie={activeCategorie._id} activeProvider={activeProvider._id}
                selectCategorie={(item) => setActiveCategorie(item)}
                selectBrand={(item) => setActiveBrand(item)}
                selectProvider={(item) => setActiveProvider(item)}
            />
            {
                selectProduct &&
                <AddProduct open={openAddProduct} onClose={() => setOpenAddProduct(false)} product={selectProduct} addCart={(item, cantidad, totalLV, precioUnitario) => addCart(item, cantidad, totalLV, precioUnitario)} />
            }
            {
                openAlertPost &&
                <AlertPostSale open={openAlertPost} onClose={() => navigation.navigate('DetailsSale', { id })} post={() => navigation.navigate('DetailsSale', { id })} print={() => generatePdf(cliente.value)} />
            }
            {
                openAlertDelete &&
                <AlertDeleteItem
                    open={openAlertDelete}
                    onClose={() => setOpenAlertDelete(false)}
                    confirm={confirmDeleteItem}
                    item={itemToDelete}
                />
            }
            <ResumeBottomSheet onPress={() => setOpenBS(true)} totalCart={total} longCart={lineaVenta.length} />
            <MyBottomSheet open={openBS} onClose={() => setOpenBS(false)} fullScreen={true} >
                <SliderSale itemSlide={[
                    <CartSale cliente={cliente} lineaVenta={lineaVenta} total={total} porcentaje={porcentaje}
                        onClick={(item) => openDeleteModal(item)}
                        upQTY={(id) => setLineaVenta((prevData) => prevData.map((elem) => {
                            return elem._id === id ? { ...elem, cantidad: elem.cantidad + 1, total: (elem.precioUnitario * (elem.cantidad + 1)).toFixed(2) } : elem
                        }))}
                        downQTY={(id) => setLineaVenta((prevData) => prevData.map((elem) => {
                            if (elem._id === id) {
                                if (elem.cantidad - 1 > 1) {
                                    return { ...elem, cantidad: elem.cantidad - 1, total: (elem.precioUnitario * (elem.cantidad - 1)).toFixed(2) }
                                }
                                return { ...elem, cantidad: 1, total: elem.precioUnitario }
                            }
                            return elem
                        }))}
                        upQTY10={(id) => setLineaVenta((prevData) => prevData.map((elem) => {
                            return elem._id === id ? { ...elem, cantidad: elem.cantidad + 10, total: (elem.precioUnitario * (elem.cantidad + 10)).toFixed(2) } : elem
                        }))}
                        downQTY10={(id) => setLineaVenta((prevData) => prevData.map((elem) => {
                            if (elem._id === id) {
                                if (elem.cantidad > 10) {
                                    return { ...elem, cantidad: elem.cantidad - 10, total: (elem.precioUnitario * (elem.cantidad - 10)).toFixed(2) }
                                }
                                return elem
                            }
                            return elem
                        }))}
                    />
                ]} onCloseSheet={() => setOpenBS(false)} finishSale={updateSaleData} />
            </MyBottomSheet>
        </SafeAreaView>
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
    titleProduct: {
        fontSize: 18,
        fontFamily: 'Cairo-Bold',
        color: '#252525'
    },
    content: {
        position: 'relative',
        backgroundColor: '#Fff',
        height: '100%'
    },
    searchBarContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 4,
    },
    searchInput: {
        flex: 1,
        height: 40,
        fontSize: 15,
        color: '#252525',
        paddingHorizontal: 10,
    },
    productCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 10,
        marginVertical: 4,
        paddingHorizontal: 16,
        paddingVertical: 10,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    productTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#252525',
    },
    productSubtitle: {
        fontSize: 13,
        color: '#7F8487',
        marginTop: 2,
        marginBottom: 2,
    },
    productTagsRow: {
        flexDirection: 'row',
        marginTop: 6,
        gap: 8,
    },
    productTag: {
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 2,
        marginRight: 8,
        borderWidth: 1,
    },
    productPrice: {
        fontSize: 20,
        color: '#2563eb',
        fontWeight: 'bold',
    },
    onlineDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
});