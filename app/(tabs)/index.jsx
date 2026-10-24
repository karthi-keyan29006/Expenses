import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Card from '../../src/components/Card';
import EmptyState, { ErrorState, LoadingState } from '../../src/components/EmptyState';
import GoalCard from '../../src/components/GoalCard';
import MonthSelector from '../../src/components/MonthSelector';
import ScreenHeader from '../../src/components/ScreenHeader';
import SectionHeader from '../../src/components/SectionHeader';
import SummaryCard from '../../src/components/SummaryCard';
import TransactionItem from '../../src/components/TransactionItem';
import { useFocusedQuery } from '../../src/hooks/useFocusedQuery';
import { getDashboardSummary } from '../../src/services/dashboardService';
import { colors, layout, radius, spacing } from '../../src/theme';
import { formatPaise } from '../../src/utils/currency';
import { currentMonth, formatMonthLabel } from '../../src/utils/dates';

const QUICK_ACTIONS = [
  { key: 'income', label: 'Income', icon: 'add-circle', color: colors.income, soft: colors.incomeSoft, href: '/transactions/add-income' },
  { key: 'expense', label: 'Expense', icon: 'remove-circle', color: colors.expense, soft: colors.expenseSoft, href: '/transactions/add-expense' },
  { key: 'savings', label: 'Savings', icon: 'flag', color: colors.savings, soft: colors.savingsSoft, href: '/goals/add-transaction' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [month, setMonth] = useState(currentMonth);
  const load = useCallback(() => getDashboardSummary(month), [month]);
  const { data, loading, error, reload } = useFocusedQuery(load);

  const openTransaction = (item) => {
    const pathname = item.kind === 'income' ? '/transactions/add-income' : '/transactions/add-expense';
    router.push({ pathname, params: { id: String(item.id) } });
  };

  return (
    <SafeAreaView style={layout.screen} edges={['top']}>
      <ScreenHeader
        title="Overview"
        subtitle="Offline · data stays on this phone"
        actionIcon="settings-outline"
        actionLabel="Open settings"
        onAction={() => router.push('/settings')}
      />
      <ScrollView contentContainerStyle={layout.content} keyboardShouldPersistTaps="handled">
        <MonthSelector month={month} onChange={setMonth} />

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <>
            <Card style={styles.hero}>
              <Text style={styles.heroLabel}>Remaining balance · {formatMonthLabel(month, { short: true })}</Text>
              <Text
                style={[styles.heroValue, data.netBalancePaise < 0 && styles.heroNegative]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatPaise(data.netBalancePaise)}
              </Text>
              <Text style={styles.heroHint}>
                {data.incomeTotalPaise > 0
                  ? `${data.spentPercent}% of income spent`
                  : 'Add your salary to start tracking this month'}
              </Text>
            </Card>

            <View style={styles.cardRow}>
              <SummaryCard label="Income" valuePaise={data.incomeTotalPaise} tone="income" />
              <SummaryCard label="Expenses" valuePaise={data.expenseTotalPaise} tone="expense" />
            </View>
            <View style={styles.cardRow}>
              <SummaryCard
                label="Put into goals"
                valuePaise={data.allocatedPaise}
                tone="savings"
                hint="Contributions − withdrawals"
              />
              <SummaryCard
                label="Unallocated"
                valuePaise={data.unallocatedPaise}
                tone="neutral"
                hint="Balance − goals"
              />
            </View>

            <View style={styles.quickActions}>
              {QUICK_ACTIONS.map((action) => (
                <Pressable
                  key={action.key}
                  onPress={() => router.push(action.href)}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${action.label.toLowerCase()}`}
                  style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
                >
                  <View style={[styles.quickIcon, { backgroundColor: action.soft }]}>
                    <Ionicons name={action.icon} size={22} color={action.color} />
                  </View>
                  <Text style={styles.quickLabel}>+ {action.label}</Text>
                </Pressable>
              ))}
            </View>

            <SectionHeader
              title="Savings goals"
              actionTitle={data.totalGoals > 0 ? 'See all' : 'New goal'}
              onAction={() => router.push(data.totalGoals > 0 ? '/goals' : '/goals/add-goal')}
            />
            {data.goals.length === 0 ? (
              <Card>
                <EmptyState
                  icon="flag-outline"
                  title="No savings goals yet"
                  message="Create a goal such as an emergency fund and track contributions towards it."
                  actionTitle="Create a goal"
                  onAction={() => router.push('/goals/add-goal')}
                  style={styles.emptyInCard}
                />
              </Card>
            ) : (
              data.goals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} compact onPress={() => router.push(`/goals/${goal.id}`)} />
              ))
            )}

            <SectionHeader
              title="Recent transactions"
              actionTitle={data.transactionCount > 0 ? 'See all' : undefined}
              onAction={() => router.push('/transactions')}
            />
            <Card padded={false}>
              {data.recentTransactions.length === 0 ? (
                <EmptyState
                  icon="receipt-outline"
                  title={`Nothing recorded for ${formatMonthLabel(month, { short: true })}`}
                  message="Use the buttons above to add your salary or an expense."
                  style={styles.emptyInCard}
                />
              ) : (
                data.recentTransactions.map((item, index) => (
                  <View key={item.key}>
                    {index > 0 ? <View style={styles.separator} /> : null}
                    <TransactionItem item={item} showDate onPress={() => openTransaction(item)} />
                  </View>
                ))
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
  heroValue: {
    color: colors.white,
    fontSize: 36,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  heroNegative: {
    color: '#FECACA',
  },
  heroHint: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.8,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  quickLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  emptyInCard: {
    paddingVertical: spacing.lg,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 68,
  },
});
