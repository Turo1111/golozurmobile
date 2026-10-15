import React, { useState, useEffect } from "react";
import { View, StyleSheet, Animated, Easing, Text, Modal, Pressable } from "react-native";
import { getLoading } from "../redux/loadingSlice";
import { useAppSelector } from "../redux/hook";
import Logo from './Logo';
import { cancelThermalPrint } from '../utils/thermal/thermalPrintWorkflow';

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
      onRequestClose={() => { if (loading.thermal) cancelThermalPrint(loading.token); }}
    >
      <View style={styles.container}>
        <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
          <Logo />
        </Animated.View>
        <Text
          style={styles.loadingText}
        >{loading.message || 'CARGANDO...'}</Text>
        {loading.thermal && <Pressable accessibilityRole="button" onPress={() => cancelThermalPrint(loading.token)}>
          <Text style={styles.loadingText}>Cancelar</Text>
        </Pressable>}
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
