import { StyleSheet, TouchableOpacity, View, Text } from 'react-native'
import React, { useState } from 'react'
import Button from './Button'
import { useAppSelector } from '../redux/hook'
import { getLoading } from '../redux/loadingSlice'
import Icon from 'react-native-vector-icons/Feather';


export default function SliderSale({ itemSlide = [1, 2, 3], onCloseSheet, finishSale }) {

    const [indexActive, setIndexActive] = useState(0)
    const loading = useAppSelector(getLoading)

    const [loadingButton, setLoadingButton] = useState(false)

    const upSlide = () => {
        indexActive < (itemSlide.length - 1) && setIndexActive(indexActive + 1)
    }

    const downSlide = () => {
        indexActive > 0 && setIndexActive(indexActive - 1)
    }

    return (
        <View style={{ paddingHorizontal: 15, paddingBottom: 10, flex: 1 }} >
            <View style={{ flex: 1, paddingBottom: 15 }} >
                {
                    itemSlide.map((item, index) => index === indexActive && <View style={{ flex: 1 }} key={index}>{item}</View>)
                }
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginVertical: 8 }}>
                <TouchableOpacity
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#6B7280',
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
                    onPress={onCloseSheet}
                >
                    <Icon name="x" size={16} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={{
                        color: '#fff',
                        fontSize: 14,
                        fontWeight: '600',
                        fontFamily: 'Cairo-Bold'
                    }}>
                        Volver
                    </Text>
                </TouchableOpacity>
                {
                    loadingButton ?
                        <TouchableOpacity
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#90EE90',
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
                        >
                            <Icon name="check" size={16} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={{
                                color: '#fff',
                                fontSize: 14,
                                fontWeight: '600',
                                fontFamily: 'Cairo-Bold'
                            }}>
                                Finalizar
                            </Text>
                        </TouchableOpacity>
                        :
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
                                setLoadingButton(true)
                                finishSale()
                            }}
                        >
                            <Icon name="check" size={16} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={{
                                color: '#fff',
                                fontSize: 14,
                                fontWeight: '600',
                                fontFamily: 'Cairo-Bold'
                            }}>
                                Finalizar
                            </Text>
                        </TouchableOpacity>
                }

            </View>
            {/* <View >
                <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                    <Button text={'Volver'} onPress={onCloseSheet} backgroundColor={indexActive === 0 && '#d9d9d9'} />
                    {
                        indexActive < (itemSlide.length - 1) ? <Button text={'Siguiente'} onPress={() => upSlide()} /> :
                            loadingButton ? <Button text={'Terminar'} disabled={true} /> : <Button text={'Terminar'} onPress={() => {
                                setLoadingButton(true)
                                finishSale()
                            }} />
                    }
                </View>
            </View> */}
        </View>
    )
}
