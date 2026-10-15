import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useAppSelector } from '../redux/hook';
import { getBlockingAlert } from '../redux/alertSlice';
import { getLoading } from '../redux/loadingSlice';
import ThermalPrintPanel from './ThermalPrintPanel';

export default function ThermalPrintModal({ workflow, visible = true }) {
  const blocking = useAppSelector(getBlockingAlert);
  const loading = useAppSelector(getLoading);
  const active = !['idle', 'settled'].includes(workflow.snapshot.phase);
  return (
    <Modal transparent visible={visible && active && !blocking && !loading.open} onRequestClose={workflow.cancel}>
      <View style={styles.host}><ThermalPrintPanel workflow={workflow} /></View>
    </Modal>
  );
}

const styles = StyleSheet.create({ host: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#0008' } });
