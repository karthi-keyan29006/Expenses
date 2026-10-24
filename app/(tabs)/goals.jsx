import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../../src/components/Button';
import Card from '../../src/components/Card';
import ChipSelect from '../../src/components/ChipSelect';
import EmptyState, { ErrorState, LoadingState } from '../../src/components/EmptyState';
import GoalCard from '../../src/components/GoalCard';
import ScreenHeader from '../../src/components/ScreenHeader';
import { getGoals } from '../../src/database/goalRepository';
import { useFocusedQuery } from '../../src/hooks/useFocusedQuery';
import { withGoalProgress } from '../../src/services/dashboardService';
import { colors, layout, spacing } from '../../src/theme';
import { formatPaise } from '../../src/utils/currency';

const FILTERS = [
  { value: 'active', label: 'Active' },
  { value: 'all', label: 'Including archived' },
];

export default function GoalsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState('active');
  const load = useCallback(() => getGoals({ includeArchived: filter === 'all' }), [filter]);
  const { data, loading, error, reload } = useFocusedQuery(load);

  const goals = useMemo(() => (data ?? []).map(withGoalProgress), [data]);
  const totals = useMemo(() => {
    const active = goals.filter((goal) => goal.isActive);
    return {
      saved: active.reduce((sum, goal) => sum + goal.balancePaise, 0),
      target: active.reduce((sum, goal) => sum + goal.targetAmountPaise, 0),
      completed: active.filter((goal) => goal.isComplete).length,
      count: active.length,
    };
  }, [goals]);

  return (
    <SafeAreaView style={layout.screen} edges={['top']}>
      <ScreenHeader
        title="Savings goals"
        actionIcon="add"
        actionLabel="Create a goal"
        onAction={() => router.push('/goals/add-goal')}
      />
      <FlatList
        data={goals}
        keyExtractor={(goal) => String(goal.id)}
        contentContainerStyle={layout.content}
        ListHeaderComponent={
          <View>
            <Card style={styles.totals}>
              <Text style={styles.totalsLabel}>Saved across active goals</Text>
              <Text style={styles.totalsValue}>{formatPaise(totals.saved)}</Text>
              <Text style={styles.totalsHint}>
                {totals.count === 0
                  ? 'Create a goal to start saving towards it.'
                  : `${formatPaise(totals.target)} targeted · ${totals.completed} of ${totals.count} reached`}
              </Text>
            </Card>
            <View style={styles.filterRow}>
              <ChipSelect options={FILTERS} value={filter} onChange={setFilter} />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <GoalCard goal={item} onPress={() => router.push(`/goals/${item.id}`)} />
        )}
        ListEmptyComponent={
          loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} onRetry={reload} />
          ) : (
            <EmptyState
              icon="flag-outline"
              title="No savings goals yet"
              message="Set a target such as an emergency fund or a new laptop, then record contributions as you save."
              actionTitle="Create a goal"
              onAction={() => router.push('/goals/add-goal')}
            />
          )
        }
        ListFooterComponent={
          goals.length > 0 ? (
            <Button
              title="New goal"
              icon="add"
              variant="secondary"
              onPress={() => router.push('/goals/add-goal')}
              style={styles.footerButton}
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  totals: {
    backgroundColor: colors.savings,
    borderColor: colors.savings,
  },
  totalsLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '500',
  },
  totalsValue: {
    color: colors.white,
    fontSize: 32,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  totalsHint: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: spacing.sm,
  },
  filterRow: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  footerButton: {
    marginTop: spacing.sm,
  },
});
