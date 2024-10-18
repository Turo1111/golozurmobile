import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import  BiTrash  from 'react-native-vector-icons/FontAwesome'; // Puedes reemplazar esto con un icono de una librería compatible con React Native como react-native-vector-icons

export default function ItemLineaVenta({ elem, onClick, upQTY, downQTY, downQTY10, upQTY10 }) {
  return (
    <View style={styles.item}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
        <View>
          <Text style={styles.description}>{elem.descripcion}</Text>
          <Text style={styles.category}>{elem.NameCategoria}</Text>
        </View>
        <Text style={styles.total}>${elem.total}</Text>
      </View>
      <View style={styles.controlsContainer}>
       {/*  <View  style={{flexDirection: 'row', justifyContent: 'space-between'}}>
          <View style={styles.quantityControls}>
            <TouchableOpacity style={styles.quantityButtonLeft} onPress={() => downQTY10(elem._id)}>
              <Text style={styles.quantityText}>-10</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quantityButtonLeft} onPress={() => downQTY(elem._id)}>
              <Text style={styles.quantityText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantity}>{elem.cantidad}</Text>
            <TouchableOpacity style={styles.quantityButtonRight} onPress={() => upQTY(elem._id)}>
              <Text style={styles.quantityText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quantityButtonRight} onPress={() => upQTY10(elem._id)}>
              <Text style={styles.quantityText}>+10</Text>
            </TouchableOpacity>
          </View>
        </View> */}
        <View style={{flexDirection: 'row', alignItems: 'center'}} >
            <TouchableOpacity>
                <Text style={{fontSize: 14, borderWidth: 1, borderColor: '#d9d9d9', paddingHorizontal: 15, 
                textAlign: 'center', paddingVertical: 5, fontWeight: 'bold', borderRadius: 100, backgroundColor: '#fff',
                color: 'black', marginRight: 5}} onPress={()=>downQTY10(elem._id)}>- 10</Text>
            </TouchableOpacity>
            <TouchableOpacity>
                <Text style={{fontSize: 14, borderWidth: 1, borderColor: '#d9d9d9', paddingHorizontal: 15, 
                textAlign: 'center', paddingVertical: 5, fontWeight: 'bold', borderRadius: 100, backgroundColor: '#fff',
                color: 'black'}} onPress={() => downQTY(elem._id)}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity>
                <Text style={{fontSize: 22, paddingHorizontal: 5, textAlign: 'center', 
                paddingVertical: 5, margin: 5, flexDirection: 'row', alignSelf: 'center',
                color: 'black', borderRadius: 10, backgroundColor: '#fff'}}>{elem.cantidad}</Text>             
            </TouchableOpacity>
            <TouchableOpacity>
                <Text style={{fontSize: 14, borderWidth: 1, borderColor: '#d9d9d9', paddingHorizontal: 15, 
                textAlign: 'center', paddingVertical: 5, fontWeight: 'bold', borderRadius: 100, backgroundColor: '#fff',
                color: 'black'}} onPress={()=>upQTY(elem._id)}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity>
                <Text style={{fontSize: 14, borderWidth: 1, borderColor: '#d9d9d9', paddingHorizontal: 15, 
                textAlign: 'center', paddingVertical: 5, fontWeight: 'bold', borderRadius: 100, backgroundColor: '#fff',
                color: 'black', marginLeft: 5}} onPress={()=>upQTY10(elem._id)}>+ 10</Text>
            </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.iconWrapper} onPress={onClick}>
          <BiTrash  name='trash-o' size={18} color='#252525' style={{textAlign: 'center'}} /> 
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    padding: 5,
    fontWeight: '600',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d1d1',
  },
  description: {
    fontSize: 14,
    color: '#252525',
  },
  category: {
    fontSize: 12,
    fontWeight: '400',
    color: '#7F8487',
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityControls: {
    flexDirection: 'row',
  },
  quantityButtonLeft: {
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: '#d9d9d9',
  },
  quantityButtonRight: {
    padding: 5,
    borderLeftWidth: 1,
    borderLeftColor: '#d9d9d9',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#7F8487',
  },
  quantity: {
    fontSize: 14,
    color: '#252525',
    padding: 10,
  },
  total: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FA9B50',
    textAlign: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    marginHorizontal: 5,
    cursor: 'pointer',
  },
});
