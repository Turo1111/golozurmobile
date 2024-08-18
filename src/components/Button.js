import { Pressable, StyleSheet, Text } from 'react-native'
import React from 'react'

export default function Button({text, width,  onPress, disabled, icon , color, fontSize, style}) {

 

  return (
    <Pressable style={[styles.button,
      {
        backgroundColor:  disabled ? '#d9d9d9' : "#fff",
        width: width ? width : '45%'
      },
      style
    ]} 
      onPress={onPress} 
      disabled={disabled}
    >
        {
          icon && icon
        }
        <Text style={{fontSize: fontSize ? fontSize : 16, fontFamily: 'Cairo-Bold', color: color ? color : '#7F8487' }}>{(text).toUpperCase()}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
    button: {
        width: '45%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderBottomWidth: 2,
        borderBottomColor: '#2366CB'
    },
})