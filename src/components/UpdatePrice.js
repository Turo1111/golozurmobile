import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import React from 'react'
import Button from './Button'
import ModalContainer from './ModalContainer';
import InputSelect from './InputSelect';
import { useFormik } from 'formik';
import { useAppSelector } from '../redux/hook';
import { getUser } from '../redux/userSlice';
import apiClient from '../utils/client';
import { useDispatch } from 'react-redux';
import { setAlert } from '../redux/alertSlice';
import useLocalStorage from '../hooks/useLocalStorage';
import Icon from 'react-native-vector-icons/Feather'
import { clearLoading, setLoading } from '../redux/loadingSlice';

export default function UpdatePrice({ open, onClose, updateQuery }) {

  const user = useAppSelector(getUser)
  const { data: userStorage } = useLocalStorage([], 'user')
  const dispatch = useDispatch()

  const formik = useFormik({
    initialValues: {
      categoria: '',
      proveedor: '',
      marca: '',
      porcentaje: '0'
    },
    validateOnChange: false,
    onSubmit: (formValue) => {
      if (parseInt(formValue.porcentaje) <= 0) {
        return dispatch(setAlert({
          message: 'Porcentaje tiene que ser mayor a 0',
          type: 'error'
        }))
      }
      if (formValue.categoria !== '' || formValue.marca !== '' || formValue.proveedor !== '') {
        dispatch(setLoading({
          message: `Actualizando producto`
        }))
        apiClient.patch(`/product`, formValue,
          {
            headers: {
              Authorization: `Bearer ${user.token || userStorage.token}` // Agregar el token en el encabezado como "Bearer {token}"
            }
          })
          .then(async (response) => {
            console.log(response)
            await updateQuery()
            formik.resetForm()
            onClose(); dispatch(clearLoading())
          })
          .catch(e => {
            console.log("error", e); dispatch(clearLoading())
            dispatch(setAlert({
              message: `${e.response?.data || 'Ocurrio un error'}`,
              type: 'error'
            }))
          })
      } else {
        return dispatch(setAlert({
          message: 'Tiene que elegir algun filtro',
          type: 'error'
        }))
      }
    }
  })

  return (
    <ModalContainer
      openModal={open}
      onClose={onClose}
      header={true}
      title='Actualizar precios'
      height={'auto'}
    >
      <InputSelect
        value={formik.values.categoria}
        onChange={(id, item) => {
          formik.setFieldValue('categoria', id)
          formik.setFieldValue('NameCategoria', item.descripcion)
        }}
        name={'Categoria'} path={'categorie'}
      />
      <InputSelect
        value={formik.values.proveedor}
        onChange={(id, item) => {
          formik.setFieldValue('proveedor', id)
          formik.setFieldValue('NameProveedor', item.descripcion)
        }}
        name={'Proveedor'} path={'provider'}
      />
      <InputSelect
        value={formik.values.marca}
        onChange={(id, item) => {
          formik.setFieldValue('marca', id)
          formik.setFieldValue('NameMarca', item.descripcion)
        }}
        name={'Marca'} path={'brand'}
      />
      <TextInput placeholder={'Procentaje'} style={styles.input}
        value={formik.values.porcentaje}
        onChangeText={(text) => formik.setFieldValue('porcentaje', text)}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginVertical: 15 }}>
        {/* <Button text={'Cancelar'} onPress={onClose} />
        <Button text={'Aceptar'} onPress={onClose} /> */}
        <TouchableOpacity
          style={{
            flex: 1,
            margin: 4,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#6B7280',
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 10,
            minWidth: 120,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 3,
          }}
          onPress={onClose}
        >
          <Icon name="x" size={16} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{
            color: '#fff',
            fontSize: 14,
            fontWeight: '600',
            fontFamily: 'Cairo-Bold'
          }}>
            Cancelar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flex: 1,
            margin: 4,
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
          }}
          onPress={formik.handleSubmit}
        >
          <Icon name="filter" size={16} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{
            color: '#fff',
            fontSize: 14,
            fontWeight: '600',
            fontFamily: 'Cairo-Bold'
          }}>
            Aplicar
          </Text>
        </TouchableOpacity>
      </View>
    </ModalContainer>
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