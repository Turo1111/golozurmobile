import { Pressable, StyleSheet, Text } from 'react-native'
import React from 'react'

export default function Button({text, width,  onPress, disabled, icon , color, fontSize, style}) {

 

  return (
    <Pressable style={styles.button} 
      onPress={onPress} 
      disabled={disabled}
    >
        {
          icon && icon
        }
        <Text style={{fontSize: fontSize ? fontSize : 16, fontFamily: 'Cairo-Bold', color: '#fff' }}>{(text).toUpperCase()}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
    button: {
        width: '45%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#537FE7',
        borderRadius: 10,
        marginTop: 15,
        paddingVertical: 5
    },
})