import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Modal, Dimensions } from 'react-native'
import React, { useEffect, useState } from 'react'
import ArrowDown from "react-native-vector-icons/MaterialIcons";
import apiClient from '../utils/client';
import { useAppDispatch, useAppSelector } from '../redux/hook';
import { getUser } from '../redux/userSlice';
import io from 'socket.io-client'
import { setAlert } from '../redux/alertSlice'
import useLocalStorage from '../hooks/useLocalStorage';
import Constants from 'expo-constants';
const DB_HOST = Constants.expoConfig?.extra?.DB_HOST;

const { width, height } = Dimensions.get('window');

export default function InputSelectAdd({ value, onChange, name, path }) {

  const [open, setOpen] = useState(false)
  const user = useAppSelector(getUser)
  const { data: userStorage } = useLocalStorage([], 'user')
  const [data, setData] = useState([])
  const [inputValue, setInputValue] = useState(value ? value : '')
  const [isActive, setIsActive] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loading2, setLoading2] = useState(false)
  const [inputPosition, setInputPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const dispatch = useAppDispatch();

  const getData = () => {
    setLoading(true)
    apiClient.get(`${path}`,
      {
        headers: {
          Authorization: `Bearer ${user.token || userStorage.token}` // Agregar el token en el encabezado como "Bearer {token}"
        },
      })
      .then(response => {
        setData(response.data)
        setLoading(false)
      })
      .catch(e => console.log("error getData", e))
  }

  const addValue = (item) => {
    onChange(item._id, item)
    setInputValue(item.descripcion)
    setOpen(false)
    setIsActive(true);
    setIsFocused(true);
  };

  const cleanValue = () => {
    onChange('', '')
    setInputValue('')
    setIsActive(false);
    setIsFocused(false);
  }

  const handleInputFocus = () => {
    setIsActive(true);
    setIsFocused(true);
  };

  const handleInputBlur = () => {
    setIsActive(inputValue !== '');
    setIsFocused(false);
  };

  const handleInputChange = (event) => {
    setInputValue(event);
  };

  const postValue = () => {
    setLoading2(true)
    apiClient.post(`/${path}`, { descripcion: inputValue },
      {
        headers: {
          Authorization: `Bearer ${user.token || userStorage.token}` // Agregar el token en el encabezado como "Bearer {token}"
        }
      })
      .then((r) => {
        onChange(r.data._id, r.data)
        dispatch(setAlert({
          message: `${name} creada correctamente`,
          type: 'success'
        }))
        setLoading2(false)
      })
      .catch(e => {
        setLoading2(false)
        dispatch(setAlert({
          message: `${e.response.data.error || 'Ocurrio un error'}`,
          type: 'error'
        }))
      })
  }

  const patchValue = () => {
    setLoading2(true)
    apiClient.patch(`/${path}/${value}`, { _id: value, descripcion: inputValue },
      {
        headers: {
          Authorization: `Bearer ${user.token || userStorage.token}` // Agregar el token en el encabezado como "Bearer {token}"
        }
      })
      .then((r) => {
        onChange('', '')
        dispatch(setAlert({
          message: `${name} modificada correctamente`,
          type: 'success'
        }))
        setLoading2(false)
      })
      .catch(e => {
        setLoading2(false)
        dispatch(setAlert({
          message: `${e.response.data.error || 'Ocurrio un error'}`,
          type: 'error'
        }))
      })
  }

  useEffect(() => {
    getData()
  }, [user.token])

  useEffect(() => {
    if (value === '' || value === undefined) {
      setInputValue('')
      setIsActive(false);
      setIsFocused(false);
    } else {
      setIsActive(true);
      setIsFocused(true);
    }
  }, [value])

  useEffect(() => {
    const socket = io(DB_HOST)
    socket.on(`${path}`, (socket) => {
      setData((prevData) => {
        const exist = prevData.find(elem => elem._id === socket.data._id)
        if (exist) {
          return prevData.map((item) =>
            item._id === socket.data._id ? socket.data : item
          )
        }
        return [...prevData, socket.data]
      })
    })
    return () => {
      socket.disconnect();
    };
  }, [data])

  useEffect(() => {
    if (inputValue !== '') {
      setOpen(false)
    }
  }, [inputValue])

  // Medir la posición del input para mostrar el modal correctamente
  const measureInputPosition = (event) => {
    if (inputRef.current) {
      inputRef.current.measure((x, y, width, height, pageX, pageY) => {
        setInputPosition({
          x: pageX,
          y: pageY + height + 2,
          width: width,
          height: height
        });
      });
    }
  };

  const inputRef = React.useRef(null);

  const openDropdown = () => {
    getData(); // Actualizar datos cuando se abre el dropdown
    measureInputPosition();
    setOpen(true);
  };

  return (
    <View style={{ zIndex: 1000 }}>
      <TextInput
        ref={inputRef}
        placeholder={name}
        style={styles.input}
        value={inputValue}
        onChangeText={handleInputChange}
        focusable={isFocused}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
      />

      {inputValue === '' ? (
        <Pressable
          style={{ position: 'absolute', right: 10, top: '25%' }}
          onPress={openDropdown}
        >
          <ArrowDown name='keyboard-arrow-down' size={28} color={'#7F8487'} />
        </Pressable>
      ) : (
        (value === '' || value === undefined) ? (
          loading2 ? (
            <Text style={{ fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginVertical: 5, marginStart: 15 }}>Cargando...</Text>
          ) : (
            <Pressable style={{ position: 'absolute', right: 10, top: '25%' }} onPress={postValue} >
              <Text style={{ fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginVertical: 5, marginStart: 15 }}>Agregar</Text>
            </Pressable>
          )
        ) : (
          loading2 ? (
            <Text style={{ fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginVertical: 5, marginStart: 15 }}>Cargando...</Text>
          ) : (
            <View style={{ position: 'absolute', right: 10, top: '25%', flexDirection: 'row' }}>
              <Pressable onPress={patchValue} >
                <Text style={{ fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginVertical: 5, marginStart: 15 }}>Modificar</Text>
              </Pressable>
              <Pressable onPress={cleanValue} >
                <Text style={{ fontSize: 16, fontFamily: 'Cairo-Regular', color: '#7F8487', marginVertical: 5, marginStart: 15 }}>Quitar</Text>
              </Pressable>
            </View>
          )
        )
      )}

      <Modal
        transparent={true}
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setOpen(false)}
          activeOpacity={1}
        >
          <View style={[
            styles.dropdownContainer,
            {
              position: 'absolute',
              top: inputPosition.y,
              left: inputPosition.x,
              width: inputPosition.width
            }
          ]}>
            <ScrollView nestedScrollEnabled style={styles.scrollView}>
              {loading ? (
                <Text style={styles.listItemText}>Cargando...</Text>
              ) : data.length === 0 ? (
                <Text style={styles.listItemText}>Lista Vacía</Text>
              ) : (
                data.map((item) => (
                  <Pressable
                    key={item._id}
                    style={styles.listItem}
                    onPress={() => addValue(item)}
                  >
                    <Text style={styles.listItemText}>{item.descripcion}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  dropdownContainer: {
    maxHeight: 200,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
  },
  scrollView: {
    maxHeight: 200,
  },
  listItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  listItemText: {
    fontSize: 16,
    fontFamily: 'Cairo-Regular',
    color: '#7F8487',
  }
})