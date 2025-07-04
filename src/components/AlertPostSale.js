import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useContext } from 'react'
import Button from './Button'
import ModalContainer from './ModalContainer'
import usePermissionCheck from '../hooks/usePermissionCheck'
import Icon from 'react-native-vector-icons/Feather';
import { OfflineContext } from '../context.js/contextOffline'

export default function AlertPostSale({ open, onClose, post, print }) {

  const { hasPermission: hasPermissionUpdateSale, isLoading: isLoadingUpdateSale } = usePermissionCheck('update_sale', () => { })
  const { offline } = useContext(OfflineContext)

  return (
    <ModalContainer
      openModal={open}
      onClose={onClose}
      header={true}
      title='¿Que desea realizar?'
      height={'auto'}
    >
      <Text style={{ textAlign: 'center', fontSize: 18 }} >La venta fue guardada</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 }} >
        {/* {hasPermissionUpdateSale && (
          <Button text={'IMPRIMIR'} onPress={print} />
        )} */}
        {
          (offline && hasPermissionUpdateSale) && (

            <TouchableOpacity style={styles.actionButton} onPress={print}>
              <Icon name="printer" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Imprimir</Text>
            </TouchableOpacity>

          )
        }
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#38b36a' }]} onPress={post}>
          <Icon name="check" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Terminar</Text>
        </TouchableOpacity>
        {/* <Button text={'TERMINAR'} onPress={post} /> */}
      </View>
    </ModalContainer>
  )
}

const styles = StyleSheet.create({

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 15,
    flex: 0.48,
    elevation: 1,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 10,
  },
})