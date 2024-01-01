import { StyleSheet, TextInput, View } from 'react-native'
import React from 'react'

export default function Search({placeholder, width, searchInput}) {
  return (
    <View style={{marginTop: 15, paddingHorizontal: 15}}>
      <TextInput placeholder={placeholder} style={[styles.input, {width: width ? width : '100%'}]} {...searchInput}/>
    </View>
  )
}

const styles = StyleSheet.create({
  search : {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
  },
  input: {
      borderWidth: 1,
      paddingVertical: 4,
      paddingHorizontal: 15,
      borderRadius: 10,
      color: '#D9D9D9',
      borderColor: '#D9D9D9',
      fontSize: 16,
      backgroundColor: '#fff',
      fontFamily: 'Cairo-Regular'
  },
})