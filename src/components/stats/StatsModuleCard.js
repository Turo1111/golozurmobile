import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function StatsModuleCard({
  icon,
  color,
  title,
  description,
  badge,
  onPress,
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}18` }]}> 
        <Icon name={icon} size={24} color={color} />
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.title}>{title}</Text>
          {badge ? <Text style={[styles.badge, { color }]}>{badge}</Text> : null}
        </View>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Icon name="chevron-right" size={22} color="#94a3b8" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  title: {
    color: '#0f172a',
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    flex: 1,
  },
  badge: {
    fontSize: 11,
    fontFamily: 'Cairo-Bold',
    textTransform: 'uppercase',
  },
  description: {
    color: '#64748b',
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
  },
});
