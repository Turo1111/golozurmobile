import { Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import ModalContainer from './ModalContainer'
import Button from './Button'
import usePermissionCheck from '../hooks/usePermissionCheck'
import Icon from 'react-native-vector-icons/Feather'

export default function AddProduct({ open, onClose, product, addCart }) {

    const [cantidad, setCantidad] = useState(1)
    const [total, setTotal] = useState(0)
    const [precioUnitario, setPrecioUnitario] = useState(0)

    const { hasPermission: hasPermissionUpdateProduct, isLoading: isLoadingUpdateProduct } = usePermissionCheck('update_product', () => { })

    useEffect(() => {
        setTotal(prevData => parseFloat(cantidad) * parseFloat(precioUnitario))
    }, [cantidad, precioUnitario])

    useEffect(() => {
        if (product) {
            setPrecioUnitario(product.precioUnitario)
        }
    }, [product])

    useEffect(() => {
        if (product !== undefined && total !== parseFloat(cantidad) * parseFloat(precioUnitario)) {
            setTotal(precioUnitario)
        }
    }, [product, precioUnitario])

    return (
        <ModalContainer
            openModal={open}
            onClose={onClose}
            header={true}
            title='Agregar producto'
            height={'auto'}
        >
            <View style={styles.card}>
                <View style={styles.contentContainer}>
                    {/* Icono */}
                    <View style={styles.iconContainer}>
                        <Icon name="box" size={20} color="#fff" />
                    </View>

                    {/* Información del producto */}
                    <View style={styles.productInfo}>
                        <Text style={styles.productTitle}>{product?.descripcion || 'No definido'}</Text>
                        <Text style={styles.categoryText}>{product?.NameCategoria || 'Sin categoría'}</Text>

                        <View style={styles.priceContainer}>
                            <Text style={styles.priceText}>${precioUnitario}</Text>
                            <Text style={styles.unitText}> c/u</Text>
                        </View>

                        {/* Controles de cantidad */}
                        <View style={styles.controlsRow}>
                            <Pressable
                                style={[styles.quantityButton, styles.increaseButton]}
                                onPress={() => { (cantidad - 10 > 0) && setCantidad(cantidad - 10) }}
                            >
                                <Text style={styles.buttonText}>-10</Text>
                            </Pressable>

                            <Pressable
                                style={[styles.quantityButton, styles.decreaseButton]}
                                onPress={() => { (cantidad - 1 > 0) && setCantidad(cantidad - 1) }}
                            >
                                <Text style={styles.buttonText}>-</Text>
                            </Pressable>

                            <View style={styles.quantityDisplay}>
                                <Text style={styles.quantityText}>{cantidad}</Text>
                            </View>

                            <Pressable
                                style={[styles.quantityButton, styles.decreaseButton]}
                                onPress={() => { setCantidad(cantidad + 1) }}
                            >
                                <Text style={styles.buttonText}>+</Text>
                            </Pressable>

                            <Pressable
                                style={[styles.quantityButton, styles.increaseButton]}
                                onPress={() => { setCantidad(cantidad + 10) }}
                            >
                                <Text style={styles.buttonText}>+10</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>

                {/* Precio unitario (solo si tiene permisos) */}
                {hasPermissionUpdateProduct && (
                    <View style={styles.priceEditContainer}>
                        <Text style={styles.priceEditLabel}>Precio unitario:</Text>
                        <View style={styles.priceEditInputContainer}>
                            <Text style={styles.currencySymbol}>$</Text>
                            <TextInput
                                placeholder={'0.00'}
                                style={styles.priceEditInput}
                                value={precioUnitario.toString()}
                                onChangeText={(e) => {
                                    if (e !== '') {
                                        setPrecioUnitario(prevData => e);
                                        setTotal(prevData => parseFloat(cantidad) * parseFloat(e))
                                        return
                                    }
                                    setPrecioUnitario(prevData => 0);
                                    return
                                }}
                                keyboardType='numeric'
                            />
                        </View>
                    </View>
                )}

                {/* Subtotal */}
                <View style={styles.subtotalContainer}>
                    <Text style={styles.subtotalLabel}>Subtotal:</Text>
                    <Text style={styles.subtotalValue}>${total.toFixed(2)}</Text>
                </View>

                {/* Botones */}
                <View style={styles.buttonsContainer}>
                    <TouchableOpacity
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#d9d9d9',
                            paddingVertical: 12,
                            paddingHorizontal: 20,
                            borderRadius: 10,
                            flex: 1,
                            marginRight: 8,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 3,
                            elevation: 3,
                        }}
                        onPress={onClose}
                    >
                        <Icon name="x" size={16} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={{
                            color: '#fff',
                            fontSize: 14,
                            fontWeight: '600',
                            fontFamily: 'Cairo-Bold'
                        }}>
                            Cancelar
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#38b36a',
                            paddingVertical: 12,
                            paddingHorizontal: 20,
                            borderRadius: 10,
                            flex: 1,
                            marginLeft: 8,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 3,
                            elevation: 3,
                        }}
                        onPress={() => {
                            onClose();
                            addCart(product, cantidad, total, precioUnitario);
                            setCantidad(1)
                        }}
                    >
                        <Icon name="check" size={16} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={{
                            color: '#fff',
                            fontSize: 14,
                            fontWeight: '600',
                            fontFamily: 'Cairo-Bold'
                        }}>
                            Agregar
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ModalContainer>
    )
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    contentContainer: {
        flexDirection: 'row',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#4A7AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    productInfo: {
        flex: 1,
    },
    productTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    categoryText: {
        fontSize: 12,
        color: '#888',
        marginBottom: 8,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    priceText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#4CAF50',
    },
    unitText: {
        fontSize: 14,
        color: '#888',
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    quantityButton: {
        width: 40,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 4,
    },
    decreaseButton: {
        backgroundColor: '#5C73F2',
    },
    increaseButton: {
        backgroundColor: '#FF9650',
    },
    buttonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    quantityDisplay: {
        paddingHorizontal: 12,
        alignItems: 'center',
    },
    quantityText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    priceEditContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    priceEditLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
        marginRight: 8,
    },
    priceEditInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        flex: 1,
    },
    currencySymbol: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4CAF50',
        marginRight: 4,
    },
    priceEditInput: {
        flex: 1,
        fontSize: 16,
        padding: 0,
        color: '#333',
    },
    subtotalContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    subtotalLabel: {
        fontSize: 14,
        color: '#666',
        marginRight: 8,
    },
    subtotalValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 20,
    }
})