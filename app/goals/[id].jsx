import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Button from '../../src/components/Button';
import Card from '../../src/components/Card';
import EmptyState, { ErrorState, LoadingState } from '../../src/components/EmptyState';
import ProgressBar from '../../src/components/ProgressBar';
import SectionHeader from '../../src/components/SectionHeader';
import {
  deleteGoal,
  deleteGoalTransaction,
  getGoalById,
  getGoalTransactions,
  setGoalActive,
} from '../../src/database/goalRepository';
import { useFocusedQuery } from '../../src/hooks/useFocusedQuery';
import { withGoalProgress } from '../../src/services/dashboardService';
import { colors, layout, radius, spacing } from '../../src/theme';
import { formatPaise } from '../../src/utils/currency';
import { currentMonth, daysBetween, formatDateLabel, monthOf, monthsBetween, todayIso } from '../../src/utils/dates';

function monthlyNeed(goal) {
  if (!goal.targetDate || goal.isComplete) {
    return null;
  }
  const months = monthsBetween(currentMonth(), monthOf(goal.targetDate));
  if (months === null || months < 0) {
    return null;
  }
  return Math.ceil(goal.remainingPaise / (months + 1));
}

function StatRow({ icon, label, value }) {
  return (
    <View style={styles.statRow}>
      <Ionicons name={icon} size={18} color={colors.muted} style={styles.statIcon} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export default function GoalDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const goalId = Number(id);

  const load = useCallback(async () => {
    const [goal, transactions] = await Promise.all([getGoalById(goalId), getGoalTransactions(goalId)]);
    return { goal: goal ? withGoalProgress(goal) : null, transactions };
  }, [goalId]);
  const { data, loading, error, reload } = useFocusedQuery(load);

  const goal = data?.goal ?? null;

  const toggleArchive = async () => {
    try {
      await setGoalActive(goalId, !goal.isActive);
      reload();
    } catch (caught) {
      Alert.alert('Could not update goal', caught.message);
    }
  };

  const confirmDeleteGoal = () => {
    Alert.alert('Delete this goal?', `"${goal.name}" will be removed permanently.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteGoal(goalId);
            router.back();
          } catch (caught) {
            Alert.alert('Could not delete', caught.message);
          }
        },
      },
    ]);
  };

  const confirmDeleteTransaction = (transaction) => {
    const label = transaction.transactionType === 'contribution' ? 'contribution' : 'withdrawal';
    Alert.alert(
      `Delete ${label}?`,
      `${formatPaise(transaction.amountPaise)} on ${formatDateLabel(transaction.transactionDate)} will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGoalTransaction(transaction.id);
              reload();
            } catch (caught) {
              Alert.alert('Could not delete', caught.message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={layout.screen}>
        <Stack.Screen options={{ title: 'Goal' }} />
        <LoadingState />
      </View>
    );
  }

  if (error || !goal) {
    return (
      <View style={layout.screen}>
        <Stack.Screen options={{ title: 'Goal' }} />
        <ErrorState error={error ?? new Error('This goal no longer exists.')} onRetry={() => router.back()} />
      </View>
    );
  }

  const accent = goal.isComplete ? colors.income : colors.savings;
  const daysLeft = goal.targetDate ? daysBetween(todayIso(), goal.targetDate) : null;
  const perMonth = monthlyNeed(goal);

  return (
    <ScrollView style={layout.screen} contentContainerStyle={layout.content}>
      <Stack.Screen
        options={{
          title: goal.name,
          headerRight: () => (
            <Pressable
              onPress={() => router.push({ pathname: '/goals/add-goal', params: { id: String(goalId) } })}
              hitSlop={8}
              accessibilityLabel="Edit goal"
            >
              <Ionicons name="create-outline" size={22} color={colors.text} />
            </Pressable>
          ),
        }}
      />

      <Card>
        <View style={styles.heroRow}>
          <View style={[styles.heroIcon, { backgroundColor: goal.isComplete ? colors.incomeSoft : colors.savingsSoft }]}>
            <Ionicons name={goal.isComplete ? 'checkmark-circle' : 'flag'} size={24} color={accent} />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroValue}>{formatPaise(goal.balancePaise)}</Text>
            <Text style={styles.heroLabel}>
              saved of {formatPaise(goal.targetAmountPaise)}
              {!goal.isActive ? ' · Archived' : ''}
            </Text>
          </View>
          <Text style={[styles.heroPercent, { color: accent }]}>{Math.round(goal.cappedPercent)}%</Text>
        </View>
        <ProgressBar percent={goal.cappedPercent} color={accent} height={10} style={styles.heroBar} />
        <Text style={styles.heroHint}>
          {goal.isComplete
            ? goal.balancePaise > goal.targetAmountPaise
              ? `Goal reached — ${formatPaise(goal.balancePaise - goal.targetAmountPaise)} over target`
              : 'Goal reached'
            : `${formatPaise(goal.remainingPaise)} to go`}
        </Text>
      </Card>

      <View style={styles.actionRow}>
        <Button
          title="Add contribution"
          icon="add"
          style={styles.actionButton}
          onPress={() =>
            router.push({ pathname: '/goals/add-transaction', params: { goalId: String(goalId), type: 'contribution' } })
          }
        />
        <Button
          title="Withdraw"
          icon="remove"
          variant="outline"
          style={styles.actionButton}
          disabled={goal.balancePaise <= 0}
          onPress={() =>
            router.push({ pathname: '/goals/add-transaction', params: { goalId: String(goalId), type: 'withdrawal' } })
          }
        />
      </View>

      <Card style={styles.stats}>
        <StatRow
          icon="calendar-outline"
          label="Target date"
          value={goal.targetDate ? formatDateLabel(goal.targetDate) : 'Not set'}
        />
        {daysLeft !== null ? (
          <StatRow
            icon="time-outline"
            label={daysLeft < 0 ? 'Overdue by' : 'Time left'}
            value={`${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'}`}
          />
        ) : null}
        {perMonth !== null ? (
          <StatRow icon="trending-up-outline" label="Needed per month" value={formatPaise(perMonth)} />
        ) : null}
        <StatRow icon="arrow-down-circle-outline" label="Total contributed" value={formatPaise(goal.contributedPaise)} />
        <StatRow icon="arrow-up-circle-outline" label="Total withdrawn" value={formatPaise(goal.withdrawnPaise)} />
      </Card>

      <SectionHeader title="History" />
      <Card padded={false}>
        {data.transactions.length === 0 ? (
          <EmptyState
            icon="wallet-outline"
            title="No contributions yet"
            message="Add your first contribution to start the progress bar moving."
            style={styles.emptyInCard}
          />
        ) : (
          data.transactions.map((transaction, index) => {
            const isContribution = transaction.transactionType === 'contribution';
            return (
              <Pressable
                key={transaction.id}
                onLongPress={() => confirmDeleteTransaction(transaction)}
                accessibilityHint="Long press to delete"
                style={({ pressed }) => [styles.historyRow, index > 0 && styles.historyBorder, pressed && styles.pressed]}
              >
                <View style={[styles.historyIcon, { backgroundColor: isContribution ? colors.incomeSoft : colors.expenseSoft }]}>
                  <Ionicons
                    name={isContribution ? 'arrow-down' : 'arrow-up'}
                    size={16}
                    color={isContribution ? colors.income : colors.expense}
                  />
                </View>
                <View style={styles.historyBody}>
                  <Text style={styles.historyTitle}>{isContribution ? 'Contribution' : 'Withdrawal'}</Text>
                  <Text style={styles.historyMeta} numberOfLines={1}>
                    {[formatDateLabel(transaction.transactionDate), transaction.note].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Text style={[styles.historyAmount, { color: isContribution ? colors.income : colors.text }]}>
                  {isContribution ? '+' : '-'}
                  {formatPaise(transaction.amountPaise)}
                </Text>
              </Pressable>
            );
          })
        )}
      </Card>
      {data.transactions.length > 0 ? (
        <Text style={styles.historyHint}>Long-press an entry to delete it.</Text>
      ) : null}

      <SectionHeader title="Manage" />
      <Button
        title={goal.isActive ? 'Archive goal' : 'Reactivate goal'}
        icon={goal.isActive ? 'archive-outline' : 'refresh-outline'}
        variant="outline"
        onPress={toggleArchive}
      />
      {data.transactions.length === 0 ? (
        <Button title="Delete goal" icon="trash-outline" variant="danger" onPress={confirmDeleteGoal} style={styles.deleteButton} />
      ) : (
        <Text style={styles.manageHint}>
          Goals with recorded contributions cannot be deleted, so your history stays intact. Archive it instead.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  heroText: {
    flex: 1,
  },
  heroValue: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  heroLabel: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  heroPercent: {
    fontSize: 20,
    fontWeight: '700',
  },
  heroBar: {
    marginTop: spacing.lg,
  },
  heroHint: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.muted,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
  stats: {
    marginTop: spacing.lg,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statIcon: {
    marginRight: spacing.sm,
  },
  statLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.muted,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  emptyInCard: {
    paddingVertical: spacing.lg,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  historyBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pressed: {
    backgroundColor: colors.neutralSoft,
  },
  historyIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  historyBody: {
    flex: 1,
    marginRight: spacing.md,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  historyMeta: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  historyAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  historyHint: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.subtle,
    textAlign: 'center',
  },
  deleteButton: {
    marginTop: spacing.md,
  },
  manageHint: {
    marginTop: spacing.md,
    fontSize: 12,
    color: colors.subtle,
    lineHeight: 18,
  },
});
