import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';

const ToggleButton = ({onPress}) => {
  const [isChecked, setIsChecked] = useState(false);
  const animation = useRef(new Animated.Value(2)).current;  // Valor inicial de 'left'

  const toggleCheck = () => {
    setIsChecked(!isChecked);
    onPress()
    // Animación para mover el botón de "YES" a "NO"
    Animated.timing(animation, {
      toValue: isChecked ? 2 : 42,  // Cambia el valor de 'left'
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  return (
    <View style={styles.toggleButtonCover}>
      <TouchableOpacity style={[styles.button,{ backgroundColor: `${isChecked ? '#FF6868' : '#A1DD70'}`}]} onPress={toggleCheck}>
        <Animated.View style={[styles.knobs, { left: animation, backgroundColor: `${isChecked ? '#FF6868' : '#A1DD70'}` }]}>
          <Text style={styles.knobText}>
            {isChecked ? 'OFF' : 'ON'}
          </Text>
        </Animated.View>
        <View style={[styles.layer, isChecked && styles.layerChecked]} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  toggleButtonCover: {
    width: 80,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  button: {
    position: 'relative',
    width: 80,
    height: 36,
    borderRadius: 100,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  knobs: {
    position: 'absolute',
    top: 2,
    width: 36,
    height: 36,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  knobText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ebf7fc',
    zIndex: 1,
  },
  layerChecked: {
    backgroundColor: '#fcebeb',
  },
});

export default ToggleButton;
