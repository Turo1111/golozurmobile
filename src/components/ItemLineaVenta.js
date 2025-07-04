import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

export default function ItemLineaVenta({ elem, onClick, upQTY, downQTY, downQTY10, upQTY10 }) {
  return (
    <View style={styles.card}>
      <View style={styles.contentContainer}>
        {/* Icono */}
        <View style={styles.iconContainer}>
          <Icon name="box" size={20} color="#fff" />
        </View>

        {/* Información del producto */}
        <View style={styles.productInfo}>
          <Text style={styles.productTitle}>{elem.descripcion}</Text>
          <Text style={styles.categoryText}>Categoría: {elem.NameCategoria}</Text>

          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>${elem.precioUnitario}</Text>
            <Text style={styles.unitText}> c/u</Text>
          </View>

          {/* Controles de cantidad */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[styles.quantityButton, styles.increaseButton]}
              onPress={() => downQTY10(elem._id)}>
              <Text style={styles.buttonText}>-10</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quantityButton, styles.decreaseButton]}
              onPress={() => downQTY(elem._id)}>
              <Text style={styles.buttonText}>-</Text>
            </TouchableOpacity>

            <View style={styles.quantityDisplay}>
              <Text style={styles.quantityText}>{elem.cantidad}</Text>
            </View>

            <TouchableOpacity
              style={[styles.quantityButton, styles.decreaseButton]}
              onPress={() => upQTY(elem._id)}>
              <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quantityButton, styles.increaseButton]}
              onPress={() => upQTY10(elem._id)}>
              <Text style={styles.buttonText}>+10</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Subtotal */}
      <View style={styles.subtotalContainer}>
        <Text style={styles.subtotalLabel}>Subtotal:</Text>
        <Text style={styles.subtotalValue}>${elem.total}</Text>
      </View>

      {/* Botón eliminar (oculto pero mantenido por funcionalidad) */}
      <TouchableOpacity style={styles.trashButton} onPress={onClick}>
        <FontAwesome name='trash' size={18} color='#FF6B6B' />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginVertical: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contentContainer: {
    flexDirection: 'row',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#4A7AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
  },
  unitText: {
    fontSize: 14,
    color: '#888',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 40,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  decreaseButton: {
    backgroundColor: '#5C73F2',
  },
  increaseButton: {
    backgroundColor: '#FF9650',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  quantityDisplay: {
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  subtotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  subtotalLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  subtotalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  trashButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  }
});

