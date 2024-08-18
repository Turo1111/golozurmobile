import { StyleSheet, View, Modal, Pressable } from 'react-native'
import React from 'react'

export default function MyBottomSheet({children, open, onClose, fullScreen = false}) {

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={open}
      onRequestClose={onClose}
    >
      <View style={{width: '100%',backgroundColor: '#fff',backgroundColor: 'rgba(217,217,217,0.7)', flex: 1, justifyContent: 'flex-end'}} >
        <View  style={{backgroundColor: 'white', flex: fullScreen ? 1 : 0, borderTopLeftRadius: 15, borderTopRightRadius: 15, width: '100%'}} >
            <Pressable  onPress={onClose} 
              style={{width: '100%', justifyContent: "center", alignItems: "center", height: 30}}
            >
              <View style={{height: 8, width: 45, backgroundColor: '#d7d7d7', borderRadius: 50}}></View>
            </Pressable>
            <View style={{flex: fullScreen ? 1 : 0}}>
              {children}
            </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
})