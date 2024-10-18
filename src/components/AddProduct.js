import { Pressable, StyleSheet, Text, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import ModalContainer from './ModalContainer'
import Button from './Button'

export default function AddProduct({open, onClose, product, addCart}) {

    const [cantidad, setCantidad] = useState(1)
    const [total, setTotal] = useState(0)

    useEffect(()=>{
        setTotal(prevData=>parseFloat(cantidad)*parseFloat(product.precioUnitario))
    },[cantidad])

    useEffect(()=>{
        if (product !== undefined && total !== parseFloat(cantidad)*parseFloat(product.precioUnitario)) {
            setTotal(product.precioUnitario)
        }   
    },[product])

  return (
    <ModalContainer
        openModal={open}
        onClose={onClose}
        header={true}
        title='Agregar producto'
        height={'auto'}
    >
        <Text style={{textAlign: 'center', fontSize: 18}} >{product?.descripcion || 'No definido'}</Text>
        <View style={{flexDirection: 'row', justifyContent: 'center'}}>
            <View style={{backgroundColor: '#fff', paddingHorizontal: 15, borderRadius: 15, marginVertical: 15, maxWidth: 320}}>
                <View style={{flexDirection: 'row', alignItems: 'center'}} >
                    <Pressable>
                        <Text style={{fontSize: 18, borderWidth: 1, borderColor: '#d9d9d9', paddingHorizontal: 15, 
                        textAlign: 'center', paddingVertical: 5, fontWeight: 'bold', borderRadius: 100, backgroundColor: '#fff',
                        color: 'black', marginRight: 5}} onPress={()=>{(cantidad-10 > 0) && setCantidad(cantidad-10)}}>- 10</Text>
                    </Pressable>
                    <Pressable>
                        <Text style={{fontSize: 18, borderWidth: 1, borderColor: '#d9d9d9', paddingHorizontal: 15, 
                        textAlign: 'center', paddingVertical: 5, fontWeight: 'bold', borderRadius: 100, backgroundColor: '#fff',
                        color: 'black'}} onPress={()=>{(cantidad-1 > 0) && setCantidad(cantidad-1)}}>-</Text>
                    </Pressable>
                    <Pressable>
                        <Text style={{fontSize: 24, paddingHorizontal: 10, textAlign: 'center', 
                        paddingVertical: 5, margin: 5, flexDirection: 'row', alignSelf: 'center',
                        color: 'black', borderRadius: 10, backgroundColor: '#fff'}}>{cantidad}</Text>             
                    </Pressable>
                    <Pressable>
                        <Text style={{fontSize: 18, borderWidth: 1, borderColor: '#d9d9d9', paddingHorizontal: 15, 
                        textAlign: 'center', paddingVertical: 5, fontWeight: 'bold', borderRadius: 100, backgroundColor: '#fff',
                        color: 'black'}} onPress={()=>{setCantidad(cantidad+1)}}>+</Text>
                    </Pressable>
                    <Pressable>
                        <Text style={{fontSize: 18, borderWidth: 1, borderColor: '#d9d9d9', paddingHorizontal: 15, 
                        textAlign: 'center', paddingVertical: 5, fontWeight: 'bold', borderRadius: 100, backgroundColor: '#fff',
                        color: 'black', marginLeft: 5}} onPress={()=>{setCantidad(cantidad+10)}}>+ 10</Text>
                    </Pressable>
                </View>
                <Text style={{fontSize: 20 ,textAlign: 'center',fontWeight: 'bold', marginBottom: 5, backgroundColor: '#fff', borderRadius: 10}}>Total: $ {total}</Text>
            </View>
        </View>
        <View style={{flexDirection: 'row', justifyContent: 'space-around'}} >
            <Button text={'Cancelar'} onPress={onClose} />
            <Button text={'Aceptar'} onPress={()=>{onClose();addCart(product, cantidad, total)}} />
        </View>
    </ModalContainer>
  )
}

const styles = StyleSheet.create({})