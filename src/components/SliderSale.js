import { StyleSheet, View } from 'react-native'
import React, { useState } from 'react'
import Button from './Button'

export default function SliderSale({itemSlide=[1,2,3], onCloseSheet, finishSale}) {

    const [indexActive, setIndexActive] = useState(0)

    const upSlide = () => {
        indexActive < (itemSlide.length-1) && setIndexActive(indexActive+1)
    }

    const downSlide = () => {
        indexActive > 0 && setIndexActive(indexActive-1)
    }

  return (
    <View style={{paddingHorizontal: 15, paddingBottom: 10, flex: 1}} >
        <View style={{flex: 1, paddingBottom: 15}} >
            {
                itemSlide.map((item,index) => index === indexActive && <View style={{flex: 1}}  key={index}>{item}</View>)
            }
        </View>
        <View >
            <View style={{flexDirection: 'row', justifyContent: 'space-around'}}>
                <Button text={'Volver'} onPress={onCloseSheet} backgroundColor={indexActive===0 && '#d9d9d9'}  />
                {
                    indexActive < (itemSlide.length-1) ? <Button text={'Siguiente'} onPress={()=>upSlide()}/> :
                    <Button text={'Terminar'} onPress={finishSale}/>
                }
                
            </View>
        </View>
    </View>
  )
}
