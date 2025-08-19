import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';

export default function ListModeSwitch({
    value,
    onValueChange,
    leftLabel = 'Servidor',
    rightLabel = 'Sin sincronizar',
}) {
    return (
        <View style={styles.container}>
            <Text style={[styles.label, !value ? styles.activeLabel : null]}>{leftLabel}</Text>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
                thumbColor={value ? '#2563eb' : '#9ca3af'}
                ios_backgroundColor="#e5e7eb"
            />
            <Text style={[styles.label, value ? styles.activeLabel : null]}>{rightLabel}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    label: {
        color: '#6b7280',
        fontSize: 13,
        marginHorizontal: 6,
    },
    activeLabel: {
        color: '#2563eb',
        fontWeight: '600',
    },
});


