import React from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/Feather'
import { normalizeArgentineMobile } from '../utils/phone'

/**
 * Editor de teléfonos con selector de "Activo WhatsApp" (F1-D2 / F1-D3).
 * Presentacional: el estado vive en `useClientPhones`.
 */
export default function PhoneEditor ({
  telefonos = [],
  telefonoActivo = null,
  telefonoInput = '',
  error = '',
  label = 'Teléfonos',
  onChangeInput,
  onAdd,
  onRemove,
  onSelect
}) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.telefonoContainer}>
        <TextInput
          style={styles.telefonoInput}
          value={telefonoInput}
          onChangeText={onChangeInput}
          placeholder="Ej. 3816041154"
          keyboardType="phone-pad"
          onSubmitEditing={onAdd}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.addButton} onPress={onAdd} accessibilityRole="button" accessibilityLabel="Agregar teléfono">
          <Icon name="plus" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {error !== '' && <Text style={styles.errorText}>{error}</Text>}

      {telefonos.length === 0 && (
        <Text style={styles.helperText}>Sin teléfonos cargados. Escribí uno y tocá Guardar: se agrega solo.</Text>
      )}

      {telefonos.map((telefono, index) => {
        const normalized = normalizeArgentineMobile(telefono)
        const display = normalized.ok ? normalized.value : String(telefono)
        const isActive = normalized.ok && normalized.value === telefonoActivo

        return (
          <View key={`${telefono}-${index}`} style={[styles.telefonoItem, isActive && styles.telefonoItemActive]}>
            <TouchableOpacity
              style={styles.telefonoSelect}
              onPress={() => onSelect(telefono)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`Marcar ${display} como activo para WhatsApp`}
            >
              <Icon
                name={isActive ? 'check-circle' : 'circle'}
                size={18}
                color={isActive ? '#10B981' : '#9ca3af'}
              />
              <View style={styles.telefonoInfo}>
                <Text style={[styles.telefonoText, isActive && styles.telefonoActivoText]}>{display}</Text>
                {isActive && <Text style={styles.activoBadge}>Activo WhatsApp</Text>}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onRemove(index)}
              style={styles.removeButtonContainer}
              accessibilityRole="button"
              accessibilityLabel={`Eliminar ${display}`}
            >
              <Icon name="trash-2" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: 16
  },
  fieldLabel: {
    fontSize: 14,
    color: '#7F8487',
    marginBottom: 5
  },
  telefonoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  telefonoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fff'
  },
  addButton: {
    backgroundColor: '#2366CB',
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 6
  },
  helperText: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 8
  },
  telefonoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  telefonoItemActive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5'
  },
  telefonoSelect: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2
  },
  telefonoInfo: {
    marginLeft: 8,
    flex: 1
  },
  telefonoText: {
    fontSize: 14,
    color: '#475569'
  },
  telefonoActivoText: {
    color: '#065f46',
    fontWeight: '600'
  },
  activoBadge: {
    fontSize: 11,
    color: '#10B981',
    marginTop: 2,
    fontWeight: '600'
  },
  removeButtonContainer: {
    padding: 6
  }
})
