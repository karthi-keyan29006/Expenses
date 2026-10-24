import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import { formatPaise } from '../utils/currency';
import Card from './Card';

const TONES = {
  income: { color: colors.income, soft: colors.incomeSoft, icon: 'arrow-down-circle' },
  expense: { color: colors.expense, soft: colors.expenseSoft, icon: 'arrow-up-circle' },
  savings: { color: colors.savings, soft: colors.savingsSoft, icon: 'flag' },
  neutral: { color: colors.primary, soft: colors.primarySoft, icon: 'wallet' },
};

/** Labelled rupee figure with an icon, used for monthly totals. */
export default function SummaryCard({ label, valuePaise, tone = 'neutral', icon, hint, style, large = false }) {
  const palette = TONES[tone] ?? TONES.neutral;
  const negative = valuePaise < 0;
  return (
    <Card style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: palette.soft }]}>
          <Ionicons name={icon ?? palette.icon} size={18} color={palette.color} />
        </View>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text
        style={[styles.value, large && styles.largeValue, negative && styles.negative]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {formatPaise(valuePaise)}
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  label: {
    flex: 1,
    fontSize: 13,
    color: colors.muted,
    fontWeight: '500',
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  largeValue: {
    fontSize: 28,
  },
  negative: {
    color: colors.expense,
  },
  hint: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.subtle,
  },
});
