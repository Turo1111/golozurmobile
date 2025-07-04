import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import Icon from 'react-native-vector-icons/Feather';

export default function ResumeBottomSheet({ onPress, longCart, totalCart }) {

  return (
    <View style={styles.resume} >
      <TouchableOpacity
        style={styles.button}
        onPress={onPress}
      >
        <View style={styles.pullBar}></View>
      </TouchableOpacity>

      <View style={styles.cardsContainer}>
        {/* Productos Card */}
        <View style={styles.productCard}>
          <View style={styles.iconContainer}>
            <Icon name="box" size={20} color="#fff" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.labelText}>Productos</Text>
            <Text style={styles.valueText}>{longCart || "0"}</Text>
          </View>
        </View>

        {/* Total Card */}
        <View style={styles.totalCard}>
          <View style={[styles.iconContainer, styles.iconContainerGreen]}>
            <Text style={styles.dollarSign}>$</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.labelText}>Total</Text>
            <Text style={styles.valueText}>${totalCart || "0"}</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    height: 30,
  },
  pullBar: {
    height: 5,
    width: 45,
    backgroundColor: '#d7d7d7',
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resume: {
    width: '100%',
    borderColor: '#f0f0f0',
    borderTopWidth: 1,
    borderRadius: 25,
    borderStyle: 'solid',
    backgroundColor: '#f8f9fa',
    paddingBottom: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12
  },
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: 5
  },
  productCard: {
    flex: 1,
    backgroundColor: '#EDF1FF',
    borderRadius: 12,
    padding: 15,
    marginRight: 5,
    flexDirection: 'row',
    alignItems: 'center'
  },
  totalCard: {
    flex: 1,
    backgroundColor: '#EAFBE7',
    borderRadius: 12,
    padding: 15,
    marginLeft: 5,
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#4A7AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  iconContainerGreen: {
    backgroundColor: '#6A9949',
  },
  dollarSign: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  textContainer: {
    flex: 1,
  },
  valueText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  labelText: {
    fontSize: 12,
    color: '#777'
  }
})