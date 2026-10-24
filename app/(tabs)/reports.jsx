import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';

import Card from '../../src/components/Card';
import EmptyState, { ErrorState, LoadingState } from '../../src/components/EmptyState';
import MonthSelector from '../../src/components/MonthSelector';
import ScreenHeader from '../../src/components/ScreenHeader';
import SectionHeader from '../../src/components/SectionHeader';
import SummaryCard from '../../src/components/SummaryCard';
import { useFocusedQuery } from '../../src/hooks/useFocusedQuery';
import { getMonthlyReport, TREND_MONTHS } from '../../src/services/reportService';
import { colors, layout, spacing } from '../../src/theme';
import { formatPaise, paiseToRupees } from '../../src/utils/currency';
import { currentMonth, formatMonthLabel, formatMonthShort } from '../../src/utils/dates';

function formatAxisRupees(label) {
  const value = Number(label);
  if (!Number.isFinite(value)) {
    return label;
  }
  if (value >= 100000) {
    return `${(value / 100000).toFixed(value % 100000 === 0 ? 0 : 1)}L`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  }
  return String(Math.round(value));
}

function DeltaRow({ label, currentPaise, previousPaise, deltaPaise, deltaPercent, goodWhenUp }) {
  const up = deltaPaise > 0;
  const flat = deltaPaise === 0;
  const good = flat ? null : goodWhenUp ? up : !up;
  const color = flat ? colors.muted : good ? colors.income : colors.expense;
  return (
    <View style={styles.deltaRow}>
      <View style={styles.deltaLabelWrap}>
        <Text style={styles.deltaLabel}>{label}</Text>
        <Text style={styles.deltaPrevious}>Previous {formatPaise(previousPaise)}</Text>
      </View>
      <View style={styles.deltaValues}>
        <Text style={styles.deltaCurrent}>{formatPaise(currentPaise)}</Text>
        <View style={styles.deltaChange}>
          {!flat ? (
            <Ionicons name={up ? 'arrow-up' : 'arrow-down'} size={13} color={color} />
          ) : null}
          <Text style={[styles.deltaText, { color }]}>
            {flat
              ? 'No change'
              : `${formatPaise(Math.abs(deltaPaise))}${deltaPercent !== null ? ` (${Math.abs(deltaPercent)}%)` : ''}`}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function ReportsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [month, setMonth] = useState(currentMonth);
  const load = useCallback(() => getMonthlyReport(month), [month]);
  const { data, loading, error, reload } = useFocusedQuery(load);

  // Screen padding + card padding on both sides.
  const chartWidth = width - spacing.lg * 4;
  // Size the grouped bars so six months always fit without scrolling.
  const yAxisLabelWidth = 40;
  const initialSpacing = 10;
  const pairGap = 3;
  const perMonth = (chartWidth - yAxisLabelWidth - initialSpacing - 4) / TREND_MONTHS;
  const barWidth = Math.max(8, Math.floor(perMonth * 0.3));
  const groupSpacing = Math.max(6, Math.floor(perMonth - barWidth * 2 - pairGap));

  const pieData = (data?.categories ?? []).map((item) => ({
    value: item.totalPaise,
    color: item.color,
  }));

  const trendData = (data?.trend ?? []).flatMap((entry) => [
    {
      value: paiseToRupees(entry.incomeTotalPaise),
      label: formatMonthShort(entry.month),
      spacing: pairGap,
      labelWidth: barWidth * 2 + pairGap + 8,
      frontColor: colors.income,
    },
    {
      value: paiseToRupees(entry.expenseTotalPaise),
      frontColor: colors.expense,
    },
  ]);
  const trendMax = Math.max(1, ...trendData.map((item) => item.value));

  return (
    <SafeAreaView style={layout.screen} edges={['top']}>
      <ScreenHeader title="Reports" subtitle="Where your money went" />
      <ScrollView contentContainerStyle={layout.content}>
        <MonthSelector month={month} onChange={setMonth} />

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <>
            <View style={styles.cardRow}>
              <SummaryCard label="Income" valuePaise={data.incomeTotalPaise} tone="income" />
              <SummaryCard label="Expenses" valuePaise={data.expenseTotalPaise} tone="expense" />
            </View>
            <View style={styles.cardRow}>
              <SummaryCard
                label="Net balance"
                valuePaise={data.netBalancePaise}
                tone="neutral"
                hint={data.savingsRatePercent !== null ? `${data.savingsRatePercent}% of income kept` : undefined}
              />
              <SummaryCard
                label="Saved to goals"
                valuePaise={data.savingsContributionsPaise}
                tone="savings"
                hint={
                  data.savingsWithdrawalsPaise > 0
                    ? `${formatPaise(data.savingsWithdrawalsPaise)} withdrawn`
                    : 'Contributions this month'
                }
              />
            </View>

            {!data.hasData ? (
              <Card style={styles.sectionCard}>
                <EmptyState
                  icon="bar-chart-outline"
                  title={`No activity in ${formatMonthLabel(month, { short: true })}`}
                  message="Reports fill in automatically once you record income and expenses for this month."
                  actionTitle="Add expense"
                  onAction={() => router.push('/transactions/add-expense')}
                  style={styles.emptyInCard}
                />
              </Card>
            ) : null}

            <SectionHeader title="Spending by category" />
            <Card>
              {data.categories.length === 0 ? (
                <EmptyState
                  icon="pie-chart-outline"
                  title="No expenses this month"
                  style={styles.emptyInCard}
                />
              ) : (
                <>
                  <View style={styles.pieWrap}>
                    <PieChart
                      data={pieData}
                      donut
                      radius={92}
                      innerRadius={60}
                      innerCircleColor={colors.card}
                      strokeWidth={2}
                      strokeColor={colors.card}
                      centerLabelComponent={() => (
                        <View style={styles.pieCenter}>
                          <Text style={styles.pieCenterLabel}>Total</Text>
                          <Text style={styles.pieCenterValue} numberOfLines={1} adjustsFontSizeToFit>
                            {formatPaise(data.expenseTotalPaise)}
                          </Text>
                        </View>
                      )}
                    />
                  </View>
                  {data.categories.map((item) => (
                    <View key={item.category} style={styles.legendRow}>
                      <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
                      <Text style={styles.legendLabel} numberOfLines={1}>
                        {item.category}
                        <Text style={styles.legendCount}>
                          {' '}
                          · {item.count} {item.count === 1 ? 'entry' : 'entries'}
                        </Text>
                      </Text>
                      <Text style={styles.legendPercent}>{item.percent}%</Text>
                      <Text style={styles.legendValue}>{formatPaise(item.totalPaise)}</Text>
                    </View>
                  ))}
                </>
              )}
            </Card>

            <SectionHeader title="Compared with last month" />
            <Card>
              <DeltaRow
                label="Income"
                currentPaise={data.incomeTotalPaise}
                previousPaise={data.previous.incomeTotalPaise}
                deltaPaise={data.comparison.incomeDeltaPaise}
                deltaPercent={data.comparison.incomeDeltaPercent}
                goodWhenUp
              />
              <View style={styles.divider} />
              <DeltaRow
                label="Expenses"
                currentPaise={data.expenseTotalPaise}
                previousPaise={data.previous.expenseTotalPaise}
                deltaPaise={data.comparison.expenseDeltaPaise}
                deltaPercent={data.comparison.expenseDeltaPercent}
                goodWhenUp={false}
              />
              <View style={styles.divider} />
              <DeltaRow
                label="Net balance"
                currentPaise={data.netBalancePaise}
                previousPaise={data.previous.netBalancePaise}
                deltaPaise={data.comparison.netDeltaPaise}
                deltaPercent={null}
                goodWhenUp
              />
            </Card>

            <SectionHeader title="Last 6 months" />
            <Card>
              <View style={styles.legendInline}>
                <View style={[styles.legendSwatch, { backgroundColor: colors.income }]} />
                <Text style={styles.legendInlineText}>Income</Text>
                <View style={[styles.legendSwatch, { backgroundColor: colors.expense, marginLeft: spacing.lg }]} />
                <Text style={styles.legendInlineText}>Expenses</Text>
              </View>
              <BarChart
                data={trendData}
                width={chartWidth - yAxisLabelWidth}
                height={180}
                barWidth={barWidth}
                spacing={groupSpacing}
                initialSpacing={initialSpacing}
                endSpacing={4}
                roundedTop
                noOfSections={4}
                maxValue={trendMax * 1.1}
                yAxisThickness={0}
                xAxisThickness={1}
                xAxisColor={colors.border}
                rulesColor={colors.border}
                yAxisTextStyle={styles.axisText}
                xAxisLabelTextStyle={styles.axisText}
                yAxisLabelWidth={yAxisLabelWidth}
                formatYLabel={formatAxisRupees}
                disableScroll
                isAnimated
              />
            </Card>

            {data.incomeByType.length > 0 ? (
              <>
                <SectionHeader title="Income sources" />
                <Card>
                  {data.incomeByType.map((item, index) => (
                    <View key={item.type} style={[styles.legendRow, index === 0 && styles.firstRow]}>
                      <View style={[styles.legendSwatch, { backgroundColor: colors.income }]} />
                      <Text style={styles.legendLabel}>
                        {item.label}
                        <Text style={styles.legendCount}>
                          {' '}
                          · {item.count} {item.count === 1 ? 'entry' : 'entries'}
                        </Text>
                      </Text>
                      <Text style={styles.legendValue}>{formatPaise(item.totalPaise)}</Text>
                    </View>
                  ))}
                </Card>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cardRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  sectionCard: {
    marginTop: spacing.lg,
  },
  emptyInCard: {
    paddingVertical: spacing.lg,
  },
  pieWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  pieCenter: {
    alignItems: 'center',
    width: 100,
  },
  pieCenterLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  pieCenterValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  firstRow: {
    paddingTop: 0,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  legendCount: {
    color: colors.subtle,
    fontWeight: '400',
    fontSize: 12,
  },
  legendPercent: {
    width: 52,
    textAlign: 'right',
    fontSize: 13,
    color: colors.muted,
  },
  legendValue: {
    minWidth: 90,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  legendInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  legendInlineText: {
    fontSize: 13,
    color: colors.muted,
  },
  axisText: {
    fontSize: 11,
    color: colors.muted,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  deltaLabelWrap: {
    flex: 1,
  },
  deltaLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  deltaPrevious: {
    fontSize: 12,
    color: colors.subtle,
    marginTop: 2,
  },
  deltaValues: {
    alignItems: 'flex-end',
  },
  deltaCurrent: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  deltaChange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  deltaText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
