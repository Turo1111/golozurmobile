import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native'
import React from 'react'
import ItemLineaVenta from './ItemLineaVenta'
import { useInputValue } from '../hooks/useInputValue'

export default function CartSale({lineaVenta, total,  onClick, upQTY, downQTY, upQTY10, downQTY10, cliente, porcentaje}) {

  return (
    <View>
        <Text style={{fontSize: 18}}>CARRITO</Text>
        <FlatList
          style={{height: '80%'}}
          data={lineaVenta}
          renderItem={({ item }) =><ItemLineaVenta elem={item}
                onClick={()=>onClick(item)}
                upQTY={(id)=>upQTY(id)}
                downQTY={(id)=>downQTY(id)}
                upQTY10={(id)=>upQTY10(id)}
                downQTY10={(id)=>downQTY10(id)}
            />
          }
          keyExtractor={(item) => item._id}
        />
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}} >
          <Text style={{fontSize: 18}}>Total: ${total}</Text>
          {/* <TextInput placeholder={'Porcentaje'} style={[styles.input, {width: 150}]} {...porcentaje} keyboardType='numeric' /> */}
        </View>
        <TextInput placeholder={'Cliente'} style={styles.input} {...cliente}/>
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