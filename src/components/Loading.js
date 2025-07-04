import React, { useState, useEffect } from "react";
import { View, StyleSheet, Animated, Easing, Text, Modal } from "react-native";
import { getLoading } from "../redux/loadingSlice";
import { useAppSelector } from "../redux/hook";
import Logo from './Logo';

export default function Loading({ text = '' }) {
  const [scaleValue] = useState(new Animated.Value(1));
  const loading = useAppSelector(getLoading);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1.15,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [scaleValue]);

  return (
    <Modal
      transparent={true}
      visible={loading.open}
    >
      <View style={styles.container}>
        <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
          <Logo />
        </Animated.View>
        <Text
          style={styles.loadingText}
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
  loadingText: {
    color: '#9E9E9E',
    fontSize: 18,
    paddingVertical: 5,
    paddingHorizontal: 15,
    marginTop: 30,
    fontFamily: 'Cairo-Bold',
    textAlign: 'center',
  },
});
