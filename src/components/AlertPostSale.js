import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import Button from './Button'
import ModalContainer from './ModalContainer'

export default function AlertPostSale({open, onClose, post, print}) {
  return (
    <ModalContainer
        openModal={open}
        onClose={onClose}
        header={true}
        title='¿Que desea realizar?'
        height={'auto'}
    >
        <Text style={{textAlign: 'center', fontSize: 18}} >La venta fue guardada</Text>
        <View style={{flexDirection: 'row', justifyContent: 'space-around'}} >
            <Button text={'IMPRIMIR'} onPress={print} />
            <Button text={'TERMINAR'} onPress={post} />
        </View>
    </ModalContainer>
  )
}

const styles = StyleSheet.create({})