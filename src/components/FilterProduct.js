import { FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import Button from './Button'
import ModalContainer from './ModalContainer';
import InputSelect from './InputSelect';
import { useFormik } from 'formik';
import { useAppSelector } from '../redux/hook';
import { getUser } from '../redux/userSlice';
import apiClient from '../utils/client';
import { useDispatch } from 'react-redux';
import { clearLoading, setLoading } from '../redux/loadingSlice'
import Icon from 'react-native-vector-icons/Feather'
import Icon2 from 'react-native-vector-icons/AntDesign';

export default function FilterProduct({ open, onClose, activeBrand, activeCategorie, activeProvider, selectCategorie, selectBrand, selectProvider }) {

  const user = useAppSelector(getUser)
  const dispatch = useDispatch()
  const [categorie, setCategorie] = useState([])
  const [brand, setBrand] = useState([])
  const [provider, setProvider] = useState([])
  const [showCategories, setShowCategories] = useState(true)
  const [showBrands, setShowBrands] = useState(false)
  const [showProviders, setShowProviders] = useState(false)

  const getCategorie = () => {
    dispatch(setLoading({
      message: `Cargando datos`
    }))
    apiClient.get(`/categorie`)
      .then(function (response) {
        setCategorie([{ _id: 1, descripcion: 'Todas' }, ...response.data]); dispatch(clearLoading())
      })
      .catch(function (error) {
        console.log("get", error);; dispatch(clearLoading())
      })
  }

  const getBrand = () => {
    apiClient.get(`/brand`)
      .then(function (response) {
        setBrand([{ _id: 1, descripcion: 'Todas' }, ...response.data])
      })
      .catch(function (error) {
        console.log("get", error);
      })
  }

  const getProvider = () => {
    apiClient.get(`/provider`)
      .then(function (response) {
        setProvider([{ _id: 1, descripcion: 'Todas' }, ...response.data])
      })
      .catch(function (error) {
        console.log("get", error);
      })
  }

  useEffect(() => {
    if (open) {
      getCategorie()
      getBrand()
      getProvider()
    }
  }, [open])

  return (
    <ModalContainer
      openModal={open}
      onClose={onClose}
      header={true}
      title='Filtrar productos'
      height={'auto'}
    >
      {/* CATEGORIAS */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Icon name="layers" size={18} color="#716A6A" style={{ marginRight: 8 }} />
        <Text style={{ fontSize: 16, fontFamily: 'Cairo-Bold', color: '#716A6A' }}>CATEGORIAS</Text>
        <TouchableOpacity
          style={{ marginLeft: 'auto' }}
          onPress={() => setShowCategories(!showCategories)}
        >
          <Icon
            name={showCategories ? "chevron-down" : "chevron-right"}
            size={20}
            color="#716A6A"
          />
        </TouchableOpacity>
      </View>
      {showCategories && (
        <FlatList
          data={categorie}
          numColumns={2}
          key={`categories-${categorie.length}`}
          columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 8 }}
          renderItem={({ item }) =>
            <View style={styles.itemContainer}>
              <TouchableOpacity
                style={[
                  styles.item,
                  activeCategorie === item._id ? styles.activeItem : styles.inactiveItem
                ]}
                onPress={() => selectCategorie(item)}
              >
                <Text style={[
                  styles.itemText,
                  activeCategorie === item._id ? styles.activeText : styles.inactiveText
                ]}>
                  {item.descripcion}
                </Text>
              </TouchableOpacity>
            </View>
          }
          keyExtractor={(item) => item._id.toString()}
          contentContainerStyle={{ paddingVertical: 4 }}
          style={{ height: '50%' }}
        />
      )}
      {/* MARCAS */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Icon2 name="copyright" size={18} color="#716A6A" style={{ marginRight: 8 }} />
        <Text style={{ fontSize: 16, fontFamily: 'Cairo-Bold', color: '#716A6A' }}>MARCAS</Text>
        <TouchableOpacity
          style={{ marginLeft: 'auto' }}
          onPress={() => setShowBrands(!showBrands)}
        >
          <Icon
            name={showBrands ? "chevron-down" : "chevron-right"}
            size={20}
            color="#716A6A"
          />
        </TouchableOpacity>
      </View>
      {showBrands && (
        <FlatList
          data={brand}
          numColumns={2}
          key={`brands-${brand.length}`}
          columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 8 }}
          renderItem={({ item }) =>
            <View style={styles.itemContainer}>
              <TouchableOpacity
                style={[
                  styles.item,
                  activeBrand === item._id ? styles.activeItem : styles.inactiveItem
                ]}
                onPress={() => selectBrand(item)}
              >
                <Text style={[
                  styles.itemText,
                  activeBrand === item._id ? styles.activeText : styles.inactiveText
                ]}>
                  {item.descripcion}
                </Text>
              </TouchableOpacity>
            </View>
          }
          keyExtractor={(item) => item._id.toString()}
          contentContainerStyle={{ paddingVertical: 4 }}
          style={{ height: '50%' }}
        />
      )}
      {/* PROVEEDORES */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Icon name="truck" size={18} color="#716A6A" style={{ marginRight: 8 }} />
        <Text style={{ fontSize: 16, fontFamily: 'Cairo-Bold', color: '#716A6A' }}>PROVEEDORES</Text>
        <TouchableOpacity
          style={{ marginLeft: 'auto' }}
          onPress={() => setShowProviders(!showProviders)}
        >
          <Icon
            name={showProviders ? "chevron-down" : "chevron-right"}
            size={20}
            color="#716A6A"
          />
        </TouchableOpacity>
      </View>
      {showProviders && (
        <FlatList
          data={provider}
          numColumns={2}
          key={`providers-${provider.length}`}
          columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 8 }}
          renderItem={({ item }) =>
            <View style={styles.itemContainer}>
              <TouchableOpacity
                style={[
                  styles.item,
                  activeProvider === item._id ? styles.activeItem : styles.inactiveItem
                ]}
                onPress={() => selectProvider(item)}
              >
                <Text style={[
                  styles.itemText,
                  activeProvider === item._id ? styles.activeText : styles.inactiveText
                ]}>
                  {item.descripcion}
                </Text>
              </TouchableOpacity>
            </View>
          }
          keyExtractor={(item) => item._id.toString()}
          contentContainerStyle={{ paddingVertical: 4 }}
          style={{ height: '50%' }}
        />
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
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
          onPress={onClose}
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
  container: {
    padding: 10,
  },
  itemContainer: {
    flex: 1,
    padding: 5,
  },
  item: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  activeItem: {
    backgroundColor: '#FFA94D',
  },
  inactiveItem: {
    backgroundColor: '#F8FAFC',
  },
  itemText: {
    fontSize: 16,
    fontFamily: 'Cairo-Regular',
  },
  activeText: {
    color: '#FFFFFF',
  },
  inactiveText: {
    color: '#3764A0',
  }
})