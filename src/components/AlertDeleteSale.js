import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import ModalContainer from './ModalContainer'
import Icon from 'react-native-vector-icons/Feather'

export default function AlertDeleteSale({ open, onClose, confirm, cliente }) {
    return (
        <ModalContainer
            openModal={open}
            onClose={onClose}
            header={true}
            title='¿Confirmar baja de la venta?'
            height={'auto'}
        >
            <Text style={{ textAlign: 'center', fontSize: 18 }}>
                {cliente ? `Se dará de baja la venta del cliente "${cliente}".` : 'Se dará de baja la venta.'}
            </Text>
            <Text style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: 6 }}>
                Esta acción no se puede deshacer.
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 }}>
                <TouchableOpacity style={styles.actionButton} onPress={onClose}>
                    <Icon name="x" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#dc2626' }]} onPress={confirm}>
                    <Icon name="trash-2" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Dar de baja</Text>
                </TouchableOpacity>
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


