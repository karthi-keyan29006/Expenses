import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import { formatPaise } from '../utils/currency';
import { daysBetween, formatDateLabel, todayIso } from '../utils/dates';
import Card from './Card';
import ProgressBar from './ProgressBar';

function describeDeadline(goal) {
  if (!goal.targetDate) {
    return null;
  }
  if (goal.isComplete) {
    return `Target ${formatDateLabel(goal.targetDate)}`;
  }
  const days = daysBetween(todayIso(), goal.targetDate);
  if (days === null) {
    return null;
  }
  if (days < 0) {
    return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  }
  if (days === 0) {
    return 'Due today';
  }
  return `${days} day${days === 1 ? '' : 's'} left`;
}

/** Goal summary with progress; expects a goal processed by withGoalProgress. */
export default function GoalCard({ goal, onPress, compact = false }) {
  const deadline = describeDeadline(goal);
  const color = goal.isComplete ? colors.income : colors.savings;
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {({ pressed }) => (
        <Card style={[styles.card, compact && styles.compact, pressed && styles.pressed, !goal.isActive && styles.archived]}>
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: goal.isComplete ? colors.incomeSoft : colors.savingsSoft }]}>
              <Ionicons name={goal.isComplete ? 'checkmark-circle' : 'flag'} size={18} color={color} />
            </View>
            <View style={styles.titleWrap}>
              <Text style={styles.name} numberOfLines={1}>
                {goal.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {[!goal.isActive ? 'Archived' : null, deadline].filter(Boolean).join(' · ') ||
                  'No target date'}
              </Text>
            </View>
            <Text style={[styles.percent, { color }]}>{Math.round(goal.cappedPercent)}%</Text>
          </View>
          <ProgressBar percent={goal.cappedPercent} color={color} style={styles.bar} />
          <View style={styles.amounts}>
            <Text style={styles.saved}>
              {formatPaise(goal.balancePaise)} <Text style={styles.of}>of {formatPaise(goal.targetAmountPaise)}</Text>
            </Text>
            {!compact ? (
              <Text style={styles.remaining}>
                {goal.isComplete ? 'Goal reached' : `${formatPaise(goal.remainingPaise)} to go`}
              </Text>
            ) : null}
          </View>
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  compact: {
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },
  archived: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  titleWrap: {
    flex: 1,
    marginRight: spacing.sm,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  meta: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  percent: {
    fontSize: 16,
    fontWeight: '700',
  },
  bar: {
    marginTop: spacing.md,
  },
  amounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saved: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  of: {
    fontWeight: '400',
    color: colors.muted,
  },
  remaining: {
    fontSize: 12,
    color: colors.muted,
  },
});
