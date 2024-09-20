import React, { useState, useEffect } from "react";
import { View, StyleSheet, Animated, Easing , Text, Modal} from "react-native";
import { getLoading } from "../redux/loadingSlice";
import { useAppSelector } from "../redux/hook";

export default function Loading({text = ''}) {
    const [rotateValue] = useState(new Animated.Value(0));
    const loading = useAppSelector(getLoading);

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateValue, {
        toValue: 1,
        duration: 300,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [rotateValue]);

  const spin = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Modal
      transparent={true}
      visible={loading.open}
    >
      <View style={styles.container}>
        <Animated.View style={[styles.circle, { transform: [{ rotate: spin }] }]} />
          <Text
            style={{
              color: '#9E9E9E',
              fontSize: 18,
              paddingVertical: 5,
              paddingHorizontal: 15,
              marginTop: 70,
              fontFamily: 'Cairo-Bold'
            }}
          >{loading.message || 'CARGANDO...'}</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: 'rgba(255,255,255,0.9)'
    },
    circle: {
      width: 50,
      height: 50,
      borderRadius: 100,
      borderWidth: 10,
      borderColor: '#537FE7',
    },
  });
