import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import { formatPaise } from '../utils/currency';
import { formatDateLabel } from '../utils/dates';

/**
 * One row in a transaction list. Expects the unified item shape produced by
 * services/transactionService (kind, title, subtitle, icon, color, amountPaise, date).
 */
export default function TransactionItem({ item, onPress, onLongPress, showDate = false }) {
  const isIncome = item.kind === 'income';
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${item.color}22` }]}>
        <Ionicons name={item.icon} size={20} color={item.color} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        {item.subtitle || showDate ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {[showDate ? formatDateLabel(item.date) : null, item.subtitle || null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.amount, isIncome ? styles.income : styles.expense]}>
        {isIncome ? '+' : '-'}
        {formatPaise(item.amountPaise)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
  },
  pressed: {
    backgroundColor: colors.neutralSoft,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  body: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
  },
  income: {
    color: colors.income,
  },
  expense: {
    color: colors.text,
  },
});
