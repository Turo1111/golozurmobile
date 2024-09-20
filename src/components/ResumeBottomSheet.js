import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'

export default function ResumeBottomSheet({onPress, longCart, totalCart}) {

  return (
    <View style={styles.resume} >
        <TouchableOpacity
          style={styles.button}
          onPress={onPress}
        >
          <View style={{height: 8, width: 45, backgroundColor: '#d7d7d7', borderRadius: 50}}></View>
        </TouchableOpacity>
        <View style={{paddingHorizontal: 10, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopColor: 'white', borderTopWidth: 1 }}>
          <Text style={{fontSize: 24, fontFamily: 'Cairo-Regular', fontWeight: '800', color: '#7F8487' }}>{longCart || "0"}</Text>
          <Text style={{fontSize: 22, fontFamily: 'Cairo-Regular', fontWeight: '600', color: '#7F8487' }}>Productos</Text>
          <Text style={{fontSize: 24, fontFamily: 'Cairo-Regular', fontWeight: '800', color: '#7F8487' }}>${totalCart || "0"}</Text>
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
    resume: {
      width: '100%', 
      borderColor: '#d7d7d7',
      borderWidth: 1,
      borderRadius: 15,
      borderStyle: 'solid',
      height: 80,
      backgroundColor: 'white'
    }
})