import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native'
import React from 'react'
import ItemLineaVenta from './ItemLineaVenta'
import { useInputValue } from '../hooks/useInputValue'
import Icon from 'react-native-vector-icons/FontAwesome';



export default function CartSale({ lineaVenta, total, onClick, upQTY, downQTY, upQTY10, downQTY10, cliente, porcentaje }) {

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8 }}>
        <View style={{ borderRadius: 12, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', marginRight: 8, padding: 12 }}>
          <Icon name="shopping-cart" size={20} color="white" />
        </View>
        <View>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#222' }}>Carrito de venta</Text>
          <Text style={{ fontSize: 12, color: '#7F8487' }}>Resumen de productos</Text>
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: '#E5E5E5', marginVertical: 8 }} />
      <FlatList
        style={{ height: '65%' }}
        data={lineaVenta}
        renderItem={({ item }) => <ItemLineaVenta elem={item}
          onClick={() => onClick(item)}
          upQTY={(id) => upQTY(id)}
          downQTY={(id) => downQTY(id)}
          upQTY10={(id) => upQTY10(id)}
          downQTY10={(id) => downQTY10(id)}
        />
        }
        keyExtractor={(item) => item._id}
      />
      <View style={{ marginVertical: 10 }}>
        <Text style={{
          fontSize: 14,
          color: '#4A7AFF',
          fontWeight: '600',
          marginBottom: 4,
          marginLeft: 2,
          flexDirection: 'row',
          alignItems: 'center'
        }}>
          <Icon name="user" size={14} color="#4A7AFF" style={{ marginRight: 4 }} />
          <Text style={{ color: '#222', fontWeight: '600', fontSize: 14 }}> Cliente : {cliente.value ? cliente.value : 'N/A'}</Text>
        </Text>
        {/* <View style={{
          borderWidth: 1,
          borderColor: '#E5EAF2',
          borderRadius: 12,
          backgroundColor: '#fff',
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}>
          <TextInput
            placeholder="Nombre del cliente (requerido)"
            placeholderTextColor="#B0B8C1"
            style={{
              fontSize: 15,
              color: '#222',
              padding: 0,
              margin: 0,
              backgroundColor: 'transparent',
            }}
            {...cliente}
          />
        </View> */}
      </View>
      <View style={{
        backgroundColor: '#eafbe7',
        borderRadius: 14,
        padding: 16,
        marginTop: 10,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}>
        {/* Total */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontWeight: 'bold', color: '#5b7c2b', fontSize: 16 }}>
            Total:
          </Text>
          <Text style={{ fontWeight: 'bold', color: '#1a3d0c', fontSize: 18 }}>
            ${Number(total).toFixed(2)}
          </Text>
        </View>
      </View>
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
  }
})