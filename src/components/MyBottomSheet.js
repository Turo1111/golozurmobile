import { StyleSheet, View, Modal, Pressable } from 'react-native';
import React from 'react';
import Alert from './Alert'; // Asegúrate de importar tu componente Alert

export default function MyBottomSheet({ children, open, onClose, fullScreen = false }) {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={open}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.bottomSheet(fullScreen)}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <View style={styles.dragIndicator}></View>
          </Pressable>
          <View style={styles.content(fullScreen)}>
            {children}
          </View>
        </View>
        {/* Aquí se coloca el Alert */}
        <Alert />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    width: '100%',
    backgroundColor: 'rgba(217,217,217,0.7)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheet: (fullScreen) => ({
    backgroundColor: 'white',
    flex: fullScreen ? 1 : 0,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    width: '100%',
  }),
  closeButton: {
    width: '100%',
    justifyContent: "center",
    alignItems: "center",
    height: 30,
  },
  dragIndicator: {
    height: 8,
    width: 45,
    backgroundColor: '#d7d7d7',
    borderRadius: 50,
  },
  content: (fullScreen) => ({
    flex: fullScreen ? 1 : 0,
  }),
});
