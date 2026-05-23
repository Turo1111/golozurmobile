import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { formatStatsCurrency } from '../../utils/statsFormatters';

export default function UserStatsCard({ user, onPress }) {
  return (
    <Pressable style={styles.card} onPress={() => onPress?.(user)}>
      <View style={styles.contentRow}>
        <View style={styles.userIconContainer}>
          <Icon name="user" size={24} color="#fff" />
        </View>

        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={styles.userName}>{user.userName}</Text>
            {user.roleName ? (
              <View style={styles.roleTag}>
                <Text style={styles.roleText}>{user.roleName}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.userStatsRow}>
            <View style={styles.userStat}>
              <Icon name="shopping-bag" size={14} color="#7F8487" style={styles.statIcon} />
              <Text style={styles.statText}>Ventas: {user.salesCount || 0}</Text>
            </View>
            <View style={styles.userStat}>
              <Icon name="dollar-sign" size={14} color="#799351" style={styles.statIcon} />
              <Text style={[styles.statText, styles.moneyText]}>Total: {formatStatsCurrency(user.totalAmount)}</Text>
            </View>
          </View>

          <Text style={styles.supportingText}>Ticket promedio: {formatStatsCurrency(user.averageTicket)}</Text>
        </View>
      </View>

      <Icon name="more-horizontal" size={20} color="#94a3b8" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  userIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  userName: {
    color: '#252525',
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    flex: 1,
    marginRight: 8,
  },
  roleTag: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#7F848722',
    borderWidth: 1,
    borderColor: '#7F8487',
  },
  roleText: {
    color: '#7F8487',
    fontSize: 11,
    fontFamily: 'Cairo-Bold',
  },
  userStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  userStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 14,
    marginBottom: 2,
  },
  statIcon: {
    marginRight: 4,
  },
  statText: {
    color: '#7F8487',
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
  },
  moneyText: {
    color: '#799351',
  },
  supportingText: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    marginTop: 2,
  },
});
