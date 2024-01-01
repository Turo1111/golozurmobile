import { StyleSheet, Text, View, Modal } from 'react-native'
import React from 'react'
import Close from 'react-native-vector-icons/AntDesign'

export default function ModalContainer({children, openModal, width, height, title, header, onClose}) {
  return (
    <Modal
    animationType="slide"
    transparent={true}
    visible={openModal}
    onRequestClose={onClose}
    >
        <View style={{width: '100%', height: '100%', backgroundColor: 'rgba(217,217,217,0.7)'}}>
            <View style={[styles.modalView, { width: width ? width : '95%', height: height ? height : '50%' }]} >
                {
                    header && 
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5}} >
                        <Text style={{fontSize: 18, fontFamily: 'Cairo-Regular', color: '#9E9E9E' }}>{title}</Text>
                        <Close name='close' size={22} color='#7F8487' onPress={onClose} />
                    </View>
                }
                {children}
            </View>
        </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
    modalView: {
        marginHorizontal: 10,
        marginTop: '50%',
        margin: 1,
        backgroundColor: "white",
        borderRadius: 15,
        padding: 15,
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
})