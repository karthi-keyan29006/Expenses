import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import { addMonths, currentMonth, formatMonthLabel } from '../utils/dates';

/** "<  October 2026  >" stepper. `month` is a "YYYY-MM" string. */
export default function MonthSelector({ month, onChange, style, compact = false }) {
  const isCurrent = month === currentMonth();
  return (
    <View style={[styles.row, compact && styles.compactRow, style]}>
      <Pressable
        onPress={() => onChange(addMonths(month, -1))}
        hitSlop={8}
        accessibilityLabel="Previous month"
        style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-back" size={20} color={colors.text} />
      </Pressable>
      <Pressable
        onPress={() => onChange(currentMonth())}
        accessibilityLabel="Jump to current month"
        style={styles.labelWrap}
      >
        <Text style={[styles.label, compact && styles.compactLabel]}>{formatMonthLabel(month)}</Text>
        {!isCurrent ? <Text style={styles.hint}>Tap for this month</Text> : null}
      </Pressable>
      <Pressable
        onPress={() => onChange(addMonths(month, 1))}
        hitSlop={8}
        accessibilityLabel="Next month"
        style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-forward" size={20} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  compactRow: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  arrow: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  pressed: {
    backgroundColor: colors.neutralSoft,
  },
  labelWrap: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  compactLabel: {
    fontSize: 16,
  },
  hint: {
    fontSize: 11,
    color: colors.subtle,
  },
});
