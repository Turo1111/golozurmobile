import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import ModalContainer from './ModalContainer'
import { useAppDispatch, useAppSelector } from '../redux/hook'
import { clearLoading, setLoading } from '../redux/loadingSlice'
import apiClient from '../utils/client'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { Buffer } from 'buffer'
import { getUser } from '../redux/userSlice'
import useLocalStorage from '../hooks/useLocalStorage'
import usePermissionCheck from '../hooks/usePermissionCheck'
import Icon from 'react-native-vector-icons/Feather'

export default function PrintProduct({ open, onClose }) {

  const [categorie, setCategorie] = useState([])
  const [selectCategorie, setSelectCategorie] = useState([{
    _id: 0,
    descripcion: 'Todas'
  }])
  const user = useAppSelector(getUser)
  const { data: userStorage } = useLocalStorage([], 'user')
  const dispatch = useAppDispatch()
  const [selectedOption, setSelectedOption] = useState('normal');
  const [shareFormat, setShareFormat] = useState('images')
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [categoriaEstado, setCategoriaEstado] = useState({
    conDescuento: [],
    sinDescuento: []
  })

  const { hasPermission: hasPermissionUpdateProduct, isLoading: isLoadingUpdateProduct } = usePermissionCheck('update_product', () => { })

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

  useEffect(() => {
    const getCategorie = () => {
      dispatch(setLoading(true));
      apiClient.get(`/categorie`)
        .then(function (response) {
          setCategorie(prevData => [{
            _id: 0,
            descripcion: 'Todas'
          }, ...response.data])
          dispatch(clearLoading())
        })
        .catch(function (error) {
          console.log("get categorie", error);
          dispatch(clearLoading())
        })
    }

    if (open) {
      getCategorie()
    }
  }, [open])

  const downloadAndShareProductList = async () => {
    const isDiscountedMode = selectedOption === 'porcentaje'
    if (isDiscountedMode && categoriaEstado.conDescuento.length === 0 && categoriaEstado.sinDescuento.length === 0) {
      alert('No hay categorías seleccionadas')
      return
    }
    if (isDiscountedMode && Number(discountPercentage) <= 0) {
      alert('No hay descuento seleccionado')
      return
    }

    const selectedCategories = selectCategorie.map(item => item._id !== 0 && item.descripcion)
    const payload = isDiscountedMode
      ? { categories: categoriaEstado, discount: Number(discountPercentage) / 100 }
      : { categories: selectedCategories[0] !== false ? selectedCategories : undefined, isPrecioUnitario: true }
    const endpoint = isDiscountedMode
      ? shareFormat === 'images' ? '/product/print/images-with-discount' : '/product/print/print-with-discount'
      : shareFormat === 'images' ? '/product/print/images' : '/product/print/print'

    dispatch(setLoading({ message: 'Creando lista de productos' }))
    try {
      if (shareFormat === 'images') {
        const { default: Share } = await import('react-native-share')
        const response = await apiClient.post(endpoint, payload, {
          timeout: 60000,
          headers: {
            Authorization: `Bearer ${user.token || userStorage.token}`
          }
        })
        const images = response.data?.images
        if (!Array.isArray(images) || images.length === 0) {
          throw new Error('No se recibieron imágenes para compartir')
        }

        await Share.open({
          urls: images.map(image => `data:${image.mimeType};base64,${image.base64}`),
          type: 'image/jpeg',
          filenames: images.map(image => image.filename),
          failOnCancel: false,
          useInternalStorage: true
        })
      } else {
        const response = await apiClient.post(endpoint, payload, {
          responseType: 'arraybuffer',
          timeout: 60000,
          headers: {
            Authorization: `Bearer ${user.token || userStorage.token}`
          }
        })
        const fileUri = `${FileSystem.documentDirectory}ListaDePrecios.pdf`
        const pdfBase64 = Buffer.from(response.data).toString('base64')
        await FileSystem.writeAsStringAsync(fileUri, pdfBase64, {
          encoding: FileSystem.EncodingType.Base64
        })
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Compartir PDF',
          UTI: 'com.adobe.pdf'
        })
      }

      onClose()
      setSelectCategorie([{ _id: 0, descripcion: 'Todas' }])
      if (isDiscountedMode) {
        setCategoriaEstado({ conDescuento: [], sinDescuento: [] })
        setDiscountPercentage(0)
      }
    } catch (error) {
      const wasCancelled = error?.code === 'E_SHARING_CANCELLED' || error?.message === 'User did not share'
      if (wasCancelled) {
        onClose()
        setSelectCategorie([{ _id: 0, descripcion: 'Todas' }])
        if (isDiscountedMode) {
          setCategoriaEstado({ conDescuento: [], sinDescuento: [] })
          setDiscountPercentage(0)
        }
      } else {
        console.error('Error al generar o compartir la lista de precios:', error)
        alert('No se pudo compartir la lista de precios')
      }
    } finally {
      dispatch(clearLoading())
    }
  }

  return (
    <View>
      <ModalContainer
        openModal={open}
        onClose={onClose}
        header={true}
        title='Imprimir productos'
        height={'auto'}
      >
        <View style={{ marginTop: 10 }}>
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
            {
              hasPermissionUpdateProduct && (
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
              )
            }
            {
              hasPermissionUpdateProduct && (
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
              )
            }
          </View>
          <View style={styles.formatSelector}>
            <Text style={styles.formatTitle}>Formato para compartir</Text>
            <View style={styles.formatOptions}>
              <TouchableOpacity
                style={styles.formatOption}
                onPress={() => setShareFormat('images')}
              >
                <View style={styles.radio}>
                  {shareFormat === 'images' && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioText}>Imágenes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.formatOption}
                onPress={() => setShareFormat('pdf')}
              >
                <View style={styles.radio}>
                  {shareFormat === 'pdf' && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioText}>PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
          {
            (selectedOption === 'normal' || selectedOption === 'descuento') &&
            <View style={{ display: 'flex', flexDirection: 'column' }}>
              <Text style={{ fontSize: 12, color: 'gray', marginTop: 10 }}>
                Seleccione las categorías que desea imprimir
              </Text>
              <ScrollView style={{ display: 'flex', height: 300 }} >
                {
                  categorie.length === 0 ? (
                    <Text style={[styles.item, { color: 'gray' }]}>
                      No hay categorías disponibles
                    </Text>
                  ) : (
                    categorie.map((item, index) => {
                      let isActive = selectCategorie?.find(elem => elem._id === item._id) ? true : false
                      return <Text
                        key={index} style={[styles.item, {
                          color: `${isActive ? '#fff' : 'black'}`,
                          backgroundColor: `${isActive ? '#3764A0' : '#fff'}`
                        }]}
                        onPress={() => {
                          setSelectCategorie((prevData) => {
                            if (item._id !== 0) {
                              let clearPrev = prevData?.filter((itemPrev) => itemPrev._id !== 0)
                              let exist = clearPrev?.find(elem => elem._id === item._id)
                              if (exist) {
                                return [...clearPrev.filter(elem => elem._id !== item._id)]
                              } else {
                                return [...clearPrev, item]
                              }
                            }
                            return [item]
                          })
                        }}
                      >{item.descripcion}</Text>
                    })
                  )
                }
              </ScrollView>
            </View>
          }
          {
            selectedOption === 'porcentaje' &&
            <View style={{ display: 'flex', flexDirection: 'column' }}>
              <Text style={{ fontSize: 12, color: 'gray', marginTop: 10 }}>
                Seleccione el porcentaje de descuento
              </Text>
              <View style={{ marginTop: 10 }}>
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
              <View style={{ display: 'flex', flexDirection: 'column' }}>
                <Text style={{ fontSize: 12, color: 'gray', marginTop: 10 }}>
                  Categorias en verde se aplica el descuento, en azul con precio normal
                </Text>
                <ScrollView style={{ display: 'flex', height: 300 }} >
                  {
                    categorie.length === 0 ? (
                      <Text style={[styles.item, { color: 'gray' }]}>
                        No hay categorías disponibles
                      </Text>
                    ) : (
                      categorie.map((item, index) => {
                        if (item._id === 0) return null

                        let isDescuento = categoriaEstado.conDescuento.find(elem => elem._id === item._id) ? true : false
                        let isNormal = categoriaEstado.sinDescuento.find(elem => elem._id === item._id) ? true : false

                        return <Text
                          key={index} style={[styles.item, {
                            color: `${isDescuento ? '#fff' : isNormal ? '#fff' : 'black'}`,
                            backgroundColor: `${isDescuento ? '#BBD8A3' : isNormal ? '#3764A0' : '#fff'}`
                          }]}
                          onPress={() => handleCategoriaEstado(item)}
                        >{item.descripcion}</Text>
                      })
                    )
                  }
                </ScrollView>
              </View>
            </View>
          }
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center' }} >
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#2366CB',
              paddingVertical: 12,
              paddingHorizontal: 20,
              borderRadius: 10,
              minWidth: 120,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
              elevation: 3,
              marginTop: 10
            }}
            onPress={downloadAndShareProductList}
          >
            <Icon name="printer" size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={{
              color: '#fff',
              fontSize: 14,
              fontWeight: '600',
              fontFamily: 'Cairo-Bold'
            }}>
              Imprimir
            </Text>
          </TouchableOpacity>
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
  formatSelector: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  formatTitle: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  formatOptions: {
    flexDirection: 'row',
    gap: 20,
  },
  formatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
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
