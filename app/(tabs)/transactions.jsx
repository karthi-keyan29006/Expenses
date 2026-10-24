import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../../src/components/Button';
import ChipSelect from '../../src/components/ChipSelect';
import EmptyState, { ErrorState, LoadingState } from '../../src/components/EmptyState';
import MonthSelector from '../../src/components/MonthSelector';
import ScreenHeader from '../../src/components/ScreenHeader';
import TransactionItem from '../../src/components/TransactionItem';
import { categoryColor, categoryIcon, EXPENSE_CATEGORIES } from '../../src/constants';
import { deleteExpense } from '../../src/database/expenseRepository';
import { deleteIncome } from '../../src/database/incomeRepository';
import { useFocusedQuery } from '../../src/hooks/useFocusedQuery';
import { getTransactions, groupTransactionsByDate } from '../../src/services/transactionService';
import { colors, layout, radius, spacing } from '../../src/theme';
import { formatPaise } from '../../src/utils/currency';
import { currentMonth, formatDateLabel, formatMonthLabel } from '../../src/utils/dates';

const KIND_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'income', label: 'Income', color: colors.income },
  { value: 'expense', label: 'Expenses', color: colors.expense },
];

const CATEGORY_OPTIONS = EXPENSE_CATEGORIES.map((category) => ({
  value: category,
  label: category,
  color: categoryColor(category),
  icon: categoryIcon(category),
}));

export default function TransactionsScreen() {
  const router = useRouter();
  const [month, setMonth] = useState(currentMonth);
  const [kind, setKind] = useState('all');
  const [category, setCategory] = useState(null);

  const effectiveCategory = kind === 'expense' ? category : null;
  const load = useCallback(
    () => getTransactions(month, { kind, category: effectiveCategory }),
    [month, kind, effectiveCategory]
  );
  const { data, loading, error, reload } = useFocusedQuery(load);

  const sections = useMemo(() => groupTransactionsByDate(data ?? []), [data]);
  const totals = useMemo(() => {
    const summary = { income: 0, expense: 0, count: 0 };
    for (const item of data ?? []) {
      summary.count += 1;
      summary[item.kind] += item.amountPaise;
    }
    return summary;
  }, [data]);

  const openItem = (item) => {
    const pathname = item.kind === 'income' ? '/transactions/add-income' : '/transactions/add-expense';
    router.push({ pathname, params: { id: String(item.id) } });
  };

  const confirmDelete = (item) => {
    Alert.alert(
      `Delete ${item.kind === 'income' ? 'income' : 'expense'}?`,
      `${item.title} · ${formatPaise(item.amountPaise)} on ${formatDateLabel(item.date)} will be removed permanently.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (item.kind === 'income') {
                await deleteIncome(item.id);
              } else {
                await deleteExpense(item.id);
              }
              reload();
            } catch (caught) {
              Alert.alert('Could not delete', caught.message);
            }
          },
        },
      ]
    );
  };

  const header = (
    <View style={styles.header}>
      <MonthSelector month={month} onChange={setMonth} />
      <View style={styles.actions}>
        <Button
          title="Income"
          icon="add"
          variant="secondary"
          compact
          style={styles.actionButton}
          onPress={() => router.push('/transactions/add-income')}
        />
        <Button
          title="Expense"
          icon="add"
          variant="secondary"
          compact
          style={styles.actionButton}
          onPress={() => router.push('/transactions/add-expense')}
        />
      </View>
      <ChipSelect options={KIND_OPTIONS} value={kind} onChange={setKind} />
      {kind === 'expense' ? (
        <View style={styles.categoryRow}>
          <ChipSelect options={CATEGORY_OPTIONS} value={category} onChange={setCategory} allowDeselect scroll />
        </View>
      ) : null}
      {data && data.length > 0 ? (
        <Text style={styles.summary}>
          {totals.count} transaction{totals.count === 1 ? '' : 's'}
          {kind !== 'expense' ? ` · In ${formatPaise(totals.income)}` : ''}
          {kind !== 'income' ? ` · Out ${formatPaise(totals.expense)}` : ''}
        </Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={layout.screen} edges={['top']}>
      <ScreenHeader title="Transactions" />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={header}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={layout.content}
        keyboardShouldPersistTaps="handled"
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{formatDateLabel(section.date)}</Text>
            <Text style={[styles.sectionTotal, section.totalPaise < 0 && styles.sectionNegative]}>
              {formatPaise(section.totalPaise, { showSign: true })}
            </Text>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <View
            style={[
              styles.itemWrap,
              index === 0 && styles.itemFirst,
              index === section.data.length - 1 && styles.itemLast,
            ]}
          >
            {index > 0 ? <View style={styles.separator} /> : null}
            <TransactionItem item={item} onPress={() => openItem(item)} onLongPress={() => confirmDelete(item)} />
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} onRetry={reload} />
          ) : (
            <EmptyState
              icon="receipt-outline"
              title={`No transactions in ${formatMonthLabel(month, { short: true })}`}
              message={
                kind === 'expense' && category
                  ? `No ${category} expenses this month. Clear the filter or add one.`
                  : 'Add your salary or an expense to see it here. Long-press any entry to delete it.'
              }
              actionTitle={kind === 'income' ? 'Add income' : 'Add expense'}
              onAction={() =>
                router.push(kind === 'income' ? '/transactions/add-income' : '/transactions/add-expense')
              }
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  categoryRow: {
    marginTop: spacing.sm,
  },
  summary: {
    marginTop: spacing.md,
    fontSize: 13,
    color: colors.muted,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTotal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.income,
  },
  sectionNegative: {
    color: colors.muted,
  },
  itemWrap: {
    backgroundColor: colors.card,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  itemFirst: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  itemLast: {
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 68,
  },
});
