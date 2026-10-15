import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { clearUser, getUser } from '../redux/userSlice';
import { clearLoading, setLoading } from '../redux/loadingSlice';
import { useAppDispatch, useAppSelector } from '../redux/hook';
import apiClient from '../utils/client';
import { useInputValue } from '../hooks/useInputValue';
import { io } from 'socket.io-client';
import useLocalStorage from '../hooks/useLocalStorage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Buffer } from 'buffer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import usePermissionCheck from '../hooks/usePermissionCheck';
import { TextInput, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import SaleItem from '../components/SaleItem';
import Constants from 'expo-constants';
import { useFocusEffect } from '@react-navigation/native';
import { decode as base64Decode } from 'base-64'
import ListModeSwitch from '../components/ListModeSwitch';
import useSalesListController from '../hooks/useSalesListController';
import useThermalPrintWorkflow from '../hooks/useThermalPrintWorkflow';
import ThermalPrintModal from '../components/ThermalPrintModal';

const decodeJWT = (token) => {
  try {
    // Dividir el token en sus partes
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid token format')
    }

    // Decodificar el payload (segunda parte)
    const payload = parts[1]
    const decodedPayload = base64Decode(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decodedPayload)
  } catch (error) {
    console.error('Error decoding JWT:', error)
    throw error
  }
}

const DB_HOST = Constants.expoConfig?.extra?.DB_HOST;

const HEADER_BLUE = '#2563eb';

const arrayBufferToBase64 = (buffer) => {
  return Buffer.from(buffer).toString('base64');
};

// Helper function to get initials from name
const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

export default function Sale({ navigation }) {
  const workflow = useThermalPrintWorkflow(navigation);

  const user = useAppSelector(getUser)
  const { data: userStorage, clearData } = useLocalStorage([], 'user')
  const dispatch = useAppDispatch();
  const search = useInputValue('', '')
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [showLocal, setShowLocal] = useState(false)
  const {
    query,
    state: salesListState,
    loadInitial,
    setSearch,
    setUser,
    loadNextPage,
    refresh,
    consumeRealtime,
    incrementPendingRealtime,
  } = useSalesListController({ limit: 25 })
  const searchDebounceRef = useRef(null)
  const serverListRef = useRef(null)
  const localListRef = useRef(null)
  const [showScrollTopButton, setShowScrollTopButton] = useState(false)

  const { hasPermission: hasPermissionReadSale, isLoading: isLoadingReadSale } = usePermissionCheck('read_sale', () => { })
  const { hasPermission: hasPermissionCreateSale, isLoading: isLoadingCreateSale } = usePermissionCheck('create_sale', () => { })
  const { hasPermission: hasPermissionUpdateSale, isLoading: isLoadingUpdateSale } = usePermissionCheck('update_sale', () => { })

  const [offline, setOffline] = useState(false)

  const { data: saleStorage } = useLocalStorage([], 'saleStorage')

  const [sales, setSales] = useState([]);

  const reloadLocalSales = useCallback(async () => {
    try {
      const json = await AsyncStorage.getItem('saleStorage');
      if (json) {
        setSales(JSON.parse(json));
      } else {
        setSales([]);
      }
    } catch (e) {
      setSales([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reloadLocalSales();
    }, [reloadLocalSales])
  );

  const logOut = useCallback(async () => {
    try {
      await clearData();
      await dispatch(clearUser());
    } catch (error) {
      console.error(error);
    }
    navigation.navigate('Login');
  }, [clearData, dispatch, navigation]);

  const getUsers = async () => {
    try {
      const response = await apiClient.get('/user/get/all');
      setUsers(response.data);
    } catch (e) {
      if (e.response.data === 'USUARIO_NO_ACTIVO') {
        logOut()
      }
      console.log("error getUsers", e)
    }
  }

  const handleServerListError = useCallback((error, context) => {
    setOffline(true)

    if (error?.response?.data === 'USUARIO_NO_ACTIVO') {
      logOut()
      return
    }

    console.log(context, error)
  }, [logOut])

  const refreshSalesList = useCallback(async () => {
    if (showLocal) {
      await reloadLocalSales()
      return
    }

    try {
      if (salesListState.pendingRealtimeCount > 0) {
        await consumeRealtime()
      } else {
        await refresh()
      }

      setOffline(false)
    } catch (error) {
      handleServerListError(error, 'error refreshing sales')
    }
  }, [consumeRealtime, handleServerListError, refresh, reloadLocalSales, salesListState.pendingRealtimeCount, showLocal])

  const scrollCurrentListToTop = useCallback((animated = true) => {
    const currentListRef = showLocal ? localListRef.current : serverListRef.current

    if (currentListRef?.scrollToOffset) {
      currentListRef.scrollToOffset({ animated, offset: 0 })
    }
  }, [showLocal])

  const applySearchToServer = useCallback(async (value) => {
    if (showLocal) {
      return
    }

    try {
      await setSearch(value, {
        userId: selectedUser?._id || null,
        userLabel: selectedUser?.nickname || '',
      })
      setOffline(false)
    } catch (error) {
      handleServerListError(error, 'error setSearch sales')
    }
  }, [handleServerListError, selectedUser, setSearch, showLocal])

  const submitSearchToServer = useCallback(async () => {
    if (showLocal) {
      return
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
    }

    await applySearchToServer(search.value)
  }, [applySearchToServer, search.value, showLocal])

  const applyUserToServer = useCallback(async (nextUser) => {
    setSelectedUser(nextUser)
    setShowUserDropdown(false)

    if (showLocal) {
      return
    }

    try {
      await setUser(nextUser?._id || null, {
        search: search.value,
        userLabel: nextUser?.nickname || '',
      })
      setOffline(false)
    } catch (error) {
      handleServerListError(error, 'error setUser sales')
    }
  }, [handleServerListError, search.value, setUser, showLocal])

  const handleLoadNextPage = useCallback(async () => {
    if (showLocal) {
      return
    }

    try {
      await loadNextPage()
      setOffline(false)
    } catch (error) {
      handleServerListError(error, 'error loadNextPage sales')
    }
  }, [handleServerListError, loadNextPage, showLocal])

  const clearUserFilter = () => {
    applyUserToServer(null);
  }

  useEffect(() => {
  }, [navigation.isFocused()])

  useEffect(() => {
    if (showLocal) {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }

      return undefined;
    }

    const desiredSearch = search.value || ''
    const desiredUserId = selectedUser?._id || null

    if (desiredSearch === query.search && desiredUserId === query.userId) {
      return undefined;
    }

    searchDebounceRef.current = setTimeout(() => {
      applySearchToServer(desiredSearch)
    }, 350)

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [applySearchToServer, query.search, query.userId, search.value, selectedUser, showLocal]);

  useEffect(() => {
    if (user && !offline && !showLocal) {
      getUsers();
    }
  }, [user, offline, showLocal]);

  useEffect(() => {
    if (!showLocal) {
      loadInitial({
        search: search.value,
        userId: selectedUser?._id || null,
        userLabel: selectedUser?.nickname || '',
      })
        .then(() => {
          setOffline(false)
        })
        .catch((error) => {
          handleServerListError(error, 'error loadInitial sales')
        })
    }
  }, [showLocal])

  useEffect(() => {
    const socket = io(DB_HOST)
    socket.on(`sale`, async (socket) => {
      if (showLocal) {
        return
      }

      let tokenDecoded = null
      try {
        if (userStorage?.token) {
          tokenDecoded = decodeJWT(userStorage.token)
        }
      } catch (error) {
        console.log('Error decoding sale socket token', error)
      }

      const isAdmin = userStorage?.nameRole === 'admin'
      const isOwnSale = tokenDecoded?.id && socket?.data?.user && tokenDecoded.id === socket.data.user

      if (!socket?.data?._id) {
        incrementPendingRealtime()
        return
      }

      if (isAdmin || isOwnSale) {
        incrementPendingRealtime()
      }
    })
    return () => {
      socket.disconnect();
    };
  }, [incrementPendingRealtime, showLocal, userStorage])

  useEffect(() => {
    setShowScrollTopButton(false)
  }, [showLocal])

  const handleListScroll = useCallback((event) => {
    const offsetY = event?.nativeEvent?.contentOffset?.y || 0
    setShowScrollTopButton(offsetY > 280)
  }, [])

  const handlePressScrollTop = useCallback(() => {
    setShowScrollTopButton(false)
    scrollCurrentListToTop()
  }, [scrollCurrentListToTop])

  const handleRefreshEntryPoint = useCallback(async () => {
    scrollCurrentListToTop()
    await refreshSalesList()
  }, [refreshSalesList, scrollCurrentListToTop])

  const downloadAndSharePDF = async (item) => {
    const fileName = `venta-${item.cliente}.pdf`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    dispatch(setLoading({
      message: `Actualizando ventas`
    }))
    try {
      // Descargar el archivo como ArrayBuffer
      const response = await apiClient.get(`/sale/print/${item._id}`, { responseType: 'arraybuffer' });
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
      } else {
        alert('La función de compartir no está disponible en este dispositivo');
      }
      dispatch(clearLoading())
    } catch (error) {
      console.error('Error descargando o compartiendo el PDF:', error);
      dispatch(clearLoading())
    }
  };

  const handleSalePress = (item) => {
    navigation.navigate('DetailsSale', {
      id: item._id,
      name: item.cliente,
    });
  };

  const filteredLocalSales = useMemo(() => {
    const term = (search.value || '').toString().toLowerCase();
    const source = saleStorage?.length ? saleStorage : sales

    if (!term) return [...source].reverse();
    try {
      return [...source]
        .filter((s) => (s?.cliente || '').toString().toLowerCase().includes(term))
        .reverse();
    } catch {
      return [...source].reverse();
    }
  }, [saleStorage, sales, search.value]);

  const serverListEmptyComponent = useMemo(() => {
    if (salesListState.status === 'initial-loading') {
      return (
        <View style={styles.listStateContainer}>
          <ActivityIndicator size="small" color={HEADER_BLUE} />
          <Text style={styles.listStateText}>Cargando ventas...</Text>
        </View>
      )
    }

    if (salesListState.status === 'error') {
      return (
        <View style={styles.listStateContainer}>
          <Text style={styles.listErrorText}>No se pudo cargar el listado de ventas.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefreshEntryPoint}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )
    }

    return (
      <View style={styles.listStateContainer}>
        <Text style={styles.listStateText}>No hay ventas para mostrar.</Text>
      </View>
    )
  }, [handleRefreshEntryPoint, salesListState.status]);

  const serverListFooterComponent = useMemo(() => {
    if (salesListState.status !== 'paginating') {
      return <View style={{ height: 16 }} />
    }

    return (
      <View style={styles.paginationFooter}>
        <ActivityIndicator size="small" color={HEADER_BLUE} />
        <Text style={styles.paginationFooterText}>Cargando más ventas...</Text>
      </View>
    )
  }, [salesListState.status]);

  if (isLoadingReadSale || !hasPermissionReadSale) {
    return null
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f6f8fa' }}>
      <View style={styles.headerContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, marginRight: 10 }}>
              <Icon name="arrow-left" size={18} color="#fff" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Ventas</Text>
              <Text style={styles.headerSubtitle}>Gestión de ventas</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.onlineBadge}>
              <View style={[styles.onlineDot, { backgroundColor: offline ? '#C7253E' : '#4CAF50' }]} />
              <Text style={{ color: '#fff', fontSize: 13, marginLeft: 4 }}>{offline ? 'Offline' : 'Online'}</Text>
            </View>
          </View>
        </View>
        {/* SEARCH BAR */}
        <View style={styles.searchBarContainer}>
          <TouchableOpacity onPress={submitSearchToServer} style={styles.searchSubmitButton}>
            <Icon name="search" size={18} color="#7F8487" />
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            placeholder={showLocal ? "Buscar ventas locales" : (selectedUser ? `Filtrando por: ${selectedUser.nickname}` : "Buscar ventas")}
            placeholderTextColor="#b0b0b0"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={submitSearchToServer}
            {...search}
          />
          {
            !showLocal && userStorage.nameRole === 'admin' &&
            <TouchableOpacity
              onPress={() => setShowUserDropdown(!showUserDropdown)}
              style={styles.dropdownButton}
            >
              <Icon name={showUserDropdown ? "chevron-up" : "chevron-down"} size={18} color="#7F8487" />
            </TouchableOpacity>
          }
        </View>

        {/* USER DROPDOWN */}
        {showUserDropdown && (
          <View style={styles.dropdownContainer}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Filtrar por usuario</Text>
              {selectedUser && (
                <TouchableOpacity onPress={clearUserFilter} style={styles.clearFilterButton}>
                  <Text style={styles.clearFilterText}>Limpiar</Text>
                </TouchableOpacity>
              )}
            </View>
            <FlatList
              data={users}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.userItem,
                    selectedUser?._id === item._id && styles.selectedUserItem
                  ]}
                  onPress={() => applyUserToServer(item)}
                >
                  <View style={styles.userInfo}>
                    <View style={styles.userInitials}>
                      <Text style={styles.userInitialsText}>
                        {getInitials(item.nickname)}
                      </Text>
                    </View>
                    <View style={styles.userDetails}>
                      <Text style={styles.userName}>{item.nickname}</Text>
                      {/* {item.role && (
                        <Text style={styles.userPhone}>{item.role}</Text>
                      )} */}
                    </View>
                  </View>
                  {selectedUser?._id === item._id && (
                    <Icon name="check" size={16} color="#2563eb" />
                  )}
                </TouchableOpacity>
              )}
              style={styles.userList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
        {/* BOTONES PRINCIPALES */}
        <View style={styles.headerButtonsRow}>
          {hasPermissionCreateSale && (
            <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('NewSale')}>
              <Icon name="plus" size={14} color="#fff" style={styles.headerButtonIcon} />
              <Text style={styles.headerButtonText}>Nueva Venta</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* SWITCH DE MODO DE LISTA */}
      <View style={styles.modeSwitchContainer}>
        <ListModeSwitch
          value={showLocal}
          onValueChange={async (v) => {
            setShowLocal(v);
            if (v) {
              await reloadLocalSales();
            }
          }}
          leftLabel="Servidor"
          rightLabel="Sin Sincronizar"
        />
      </View>
      {
        !showLocal ?
            <View style={{ flex: 1, paddingHorizontal: 15, paddingTop: 10 }}>
              {salesListState.pendingRealtimeCount > 0 && (
                <TouchableOpacity style={styles.realtimeBanner} onPress={handleRefreshEntryPoint}>
                  <Icon name="refresh-cw" size={16} color={HEADER_BLUE} />
                  <Text style={styles.realtimeBannerText}>
                    Hay {salesListState.pendingRealtimeCount} venta{salesListState.pendingRealtimeCount === 1 ? '' : 's'} nueva{salesListState.pendingRealtimeCount === 1 ? '' : 's'}. Tocá para actualizar.
                  </Text>
                </TouchableOpacity>
              )}

              {salesListState.status === 'refreshing' && (
                <View style={styles.refreshingBanner}>
                  <ActivityIndicator size="small" color={HEADER_BLUE} />
                  <Text style={styles.refreshingBannerText}>Actualizando ventas...</Text>
                </View>
              )}

              {salesListState.status === 'error' && salesListState.items.length > 0 && (
                <View style={styles.inlineErrorBanner}>
                  <Text style={styles.inlineErrorText}>No se pudo actualizar la lista. Mostrando datos previos.</Text>
                </View>
              )}

              <FlatList
                ref={serverListRef}
                style={{ flex: 1 }}
                data={salesListState.items}
                renderItem={({ item }) => (
                  <SaleItem
                    item={item}
                    isOffline={false}
                    hasPermissionUpdateSale={hasPermissionUpdateSale}
                    onPress={() => handleSalePress(item)}
                    onDownloadPDF={() => downloadAndSharePDF(item)}
                    onPrintThermal={() => workflow.start({ mode: 'online', saleId: item._id })}
                  />
                )}
                keyExtractor={(item) => item._id}
                onEndReached={handleLoadNextPage}
                onEndReachedThreshold={0.5}
                onScroll={handleListScroll}
                scrollEventThrottle={16}
                refreshing={salesListState.status === 'refreshing'}
                onRefresh={refreshSalesList}
                ListFooterComponent={serverListFooterComponent}
                ListEmptyComponent={serverListEmptyComponent}
              />
            </View> :
          <View style={{ flex: 1, paddingHorizontal: 15, paddingTop: 10 }}>
            <Text style={styles.offlineMessage}>Listando ventas locales</Text>
            <FlatList
              ref={localListRef}
              style={{ flex: 1 }}
              data={filteredLocalSales}
              renderItem={({ item }) => (
                <SaleItem
                  item={item}
                  isOffline={true}
                  hasPermissionUpdateSale={hasPermissionUpdateSale}
                  onPrintThermal={() => workflow.start({ mode: 'provided', provided: JSON.parse(JSON.stringify(item)) })}
                />
              )}
              keyExtractor={(_, index) => `offline-sale-${index}`}
              onScroll={handleListScroll}
              scrollEventThrottle={16}
              ListEmptyComponent={<Text style={{ fontSize: 18, fontFamily: 'Cairo-Regular', paddingHorizontal: 15, textAlign: 'center', marginTop: '15%' }} >SIN VENTAS EN MODO OFFLINE</Text>}
            />
          </View>
      }

      <ThermalPrintModal workflow={workflow} />
      {showScrollTopButton && (
        <TouchableOpacity style={styles.scrollTopButton} onPress={handlePressScrollTop}>
          <Icon name="arrow-up" size={18} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: HEADER_BLUE,
    paddingTop: 40,
    paddingBottom: 18,
    paddingHorizontal: 15,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#e0e7ff',
    fontSize: 13,
  },
  onlineBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
  searchSubmitButton: {
    marginLeft: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
    color: '#252525',
    paddingHorizontal: 10,
  },
  headerButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  headerButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 4,
    marginTop: 0,
    marginBottom: 0,
    minWidth: 110,
    justifyContent: 'center',
  },
  headerButtonIcon: {
    marginRight: 8,
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  offlineMessage: {
    fontSize: 14,
    color: '#C7253E',
    paddingHorizontal: 15,
    paddingVertical: 6,
    backgroundColor: '#ffeeee',
    borderRadius: 8,
    marginHorizontal: 10,
    marginVertical: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  modeSwitchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownButton: {
    padding: 10,
    marginRight: 5,
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginTop: 5,
    marginBottom: 10,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#252525',
  },
  clearFilterButton: {
    backgroundColor: '#ff4757',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearFilterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  userList: {
    maxHeight: 250,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  selectedUserItem: {
    backgroundColor: '#f0f8ff',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userInitials: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInitialsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#252525',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 13,
    color: '#6b7280',
  },
  realtimeBanner: {
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  realtimeBannerText: {
    color: HEADER_BLUE,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  refreshingBanner: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  refreshingBannerText: {
    color: HEADER_BLUE,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  inlineErrorBanner: {
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inlineErrorText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  listStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 48,
  },
  listStateText: {
    color: '#4b5563',
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
  },
  listErrorText: {
    color: '#b91c1c',
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: HEADER_BLUE,
    borderRadius: 10,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  paginationFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 18,
    paddingTop: 6,
  },
  paginationFooterText: {
    color: '#4b5563',
    fontSize: 13,
    marginTop: 8,
  },
  scrollTopButton: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: HEADER_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
})
