import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useDate } from '../hooks/useDate';
export default function Table({ data = [], columns, onClick, date = false, maxHeight = true, title }) {
  return (
    <View>
      {title && <Text style={styles.title}>{title}</Text>}
      <ScrollView style={[styles.list, maxHeight && { maxHeight: 450 }]}>
        <View style={styles.tableHeader}>
          {columns.map((column, index) => (
            <Text key={index} style={[styles.column, { flexBasis: column.width, textAlign: column.align }]}>
              {column.label}
            </Text>
          ))}
        </View>
        {data.length === 0 ? (
          <View style={styles.tableRow}>
            <Text style={[styles.cell, { textAlign: 'center' }]}>NO HAY ELEMENTOS</Text>
          </View>
        ) : (
          data.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => onClick(item)}
              style={[styles.tableRow, onClick && { cursor: 'pointer' }]}
            >
              {columns.map((column, columnIndex) => {
                const fecha = useDate(item[column.field]).date;
                return (
                  <Text
                    key={columnIndex}
                    style={[styles.cell, { flexBasis: column.width, textAlign: column.align }]}
                  >
                    {column.date
                      ? fecha
                      : column.price
                      ? `$ ${item[column.field]?.toString()}`
                      : item[column.field]?.toString()}
                  </Text>
                );
              })}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    paddingHorizontal: 15,
    fontWeight: '600',
    marginVertical: 5,
    color: '#000000', // Puedes ajustar este color
  },
  list: {
    padding: 0,
  },
  tableHeader: {
    borderRadius: 3,
    paddingVertical: 15,
    paddingHorizontal: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    color: '#000000', // Puedes ajustar este color
    backgroundColor: '#F9F5F6',
    fontSize: 18,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.03,
  },
  tableRow: {
    borderRadius: 3,
    paddingVertical: 15,
    paddingHorizontal: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    fontWeight: '600',
    color: '#000000', // Puedes ajustar este color
    fontSize: 18,
    backgroundColor: '#ffffff',
  },
  cell: {
    flexBasis: 'auto',
    textAlign: 'left',
  },
});
