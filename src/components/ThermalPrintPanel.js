import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function ThermalPrintPanel({ workflow }) {
  const { snapshot, scan, select, retry, cancel } = workflow;
  if (['idle', 'settled'].includes(snapshot.phase)) return null;
  const busy = ['preparing', 'scanning', 'saving', 'resuming', 'printing'].includes(snapshot.phase);
  const failed = ['scan-error', 'save-error'].includes(snapshot.phase);
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Imprimir ticket</Text>
      <Text accessibilityLiveRegion="polite">{snapshot.message || 'Preparando impresión...'}</Text>
      {(snapshot.candidates || []).map((device) => (
        <Pressable key={device.id} accessibilityRole="button" accessibilityLabel={`Seleccionar ${device.name || 'impresora'} ${device.id}`}
          disabled={busy || snapshot.phase === 'save-error'} style={styles.button} onPress={() => select(device)}>
          <Text>{device.name || 'Impresora'} · {device.id}</Text>
        </Pressable>
      ))}
      {snapshot.phase === 'needs-selection' && <Pressable accessibilityRole="button" style={styles.button} onPress={scan}><Text>Buscar impresora</Text></Pressable>}
      {failed && <Pressable accessibilityRole="button" style={styles.button} onPress={retry}><Text>Reintentar</Text></Pressable>}
      <Pressable accessibilityRole="button" style={styles.button} onPress={cancel}><Text>Cancelar</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { padding: 20, gap: 12, backgroundColor: '#fff', borderRadius: 12 },
  title: { fontSize: 18, fontWeight: 'bold' },
  button: { padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8 },
});
