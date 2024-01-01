import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function Logo({ small = false }) {
  return (
    <TouchableOpacity onPress={() => { /* Handle navigation here */ }}>
      <View style={styles.container}>
        <View style={styles.golozur}>
          <Text style={[styles.colorBlue, {fontSize: 40, fontWeight: 'bold'}]}>GOLO</Text>
          <Text style={[styles.colorOrange, {fontSize: 40, fontWeight: 'bold'}]}>ZUR</Text>
        </View>
        <View style={styles.distri}>
          <Text style={[styles.colorBlue, {fontSize: 16, fontWeight: 'bold'}]}>DISTRI</Text>
          <Text style={[styles.colorOrange, {fontSize: 16, fontWeight: 'bold'}]}>BUIDORA</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10
  },
  golozur: {
    fontWeight: 'bold',
    flexDirection: 'row'
  },
  distri: {
    fontWeight: 'bold',
    flexDirection: 'row',
    marginTop: -10
  },
  colorBlue: {
    color: '#3764A0',
  },
  colorOrange: {
    color: '#FA9B50',
  },
});