import { categoryColor, incomeTypeLabel } from '../constants';
import { getCategoryTotalsForMonth, getExpenseTotalForMonth } from '../database/expenseRepository';
import { getGoalActivityForMonth } from '../database/goalRepository';
import { getIncomeTotalForMonth, getIncomeTotalsByType } from '../database/incomeRepository';
import { percentOf } from '../utils/currency';
import { addMonths, lastNMonths } from '../utils/dates';

export const TREND_MONTHS = 6;

/** Pure helper: compares this month's totals with the previous month's. */
export function buildComparison(current, previous) {
  const incomeDeltaPaise = current.incomeTotalPaise - previous.incomeTotalPaise;
  const expenseDeltaPaise = current.expenseTotalPaise - previous.expenseTotalPaise;
  const netDeltaPaise = current.netBalancePaise - previous.netBalancePaise;
  return {
    incomeDeltaPaise,
    expenseDeltaPaise,
    netDeltaPaise,
    incomeDeltaPercent:
      previous.incomeTotalPaise > 0 ? percentOf(incomeDeltaPaise, previous.incomeTotalPaise, 1) : null,
    expenseDeltaPercent:
      previous.expenseTotalPaise > 0 ? percentOf(expenseDeltaPaise, previous.expenseTotalPaise, 1) : null,
  };
}

/** Pure helper: adds share-of-spending and colours to category totals. */
export function buildCategoryBreakdown(categoryRows, expenseTotalPaise) {
  return categoryRows.map((row) => ({
    category: row.category,
    totalPaise: Number(row.totalPaise),
    count: Number(row.count),
    percent: percentOf(Number(row.totalPaise), expenseTotalPaise, 1),
    color: categoryColor(row.category),
  }));
}

async function getMonthTotals(month) {
  const [incomeTotalPaise, expenseTotalPaise] = await Promise.all([
    getIncomeTotalForMonth(month),
    getExpenseTotalForMonth(month),
  ]);
  return {
    month,
    incomeTotalPaise,
    expenseTotalPaise,
    netBalancePaise: incomeTotalPaise - expenseTotalPaise,
  };
}

export async function getMonthlyReport(month) {
  const previousMonth = addMonths(month, -1);
  const trendMonths = lastNMonths(month, TREND_MONTHS);

  const [current, previous, categoryRows, incomeRows, goalActivity, trend] = await Promise.all([
    getMonthTotals(month),
    getMonthTotals(previousMonth),
    getCategoryTotalsForMonth(month),
    getIncomeTotalsByType(month),
    getGoalActivityForMonth(month),
    Promise.all(trendMonths.map((trendMonth) => getMonthTotals(trendMonth))),
  ]);

  const categories = buildCategoryBreakdown(categoryRows, current.expenseTotalPaise);

  return {
    ...current,
    categories,
    topCategory: categories[0] ?? null,
    incomeByType: incomeRows.map((row) => ({
      type: row.type,
      label: incomeTypeLabel(row.type),
      totalPaise: Number(row.totalPaise),
      count: Number(row.count),
    })),
    savingsContributionsPaise: goalActivity.contributionsPaise,
    savingsWithdrawalsPaise: goalActivity.withdrawalsPaise,
    savingsNetPaise: goalActivity.netPaise,
    savingsRatePercent:
      current.incomeTotalPaise > 0 ? percentOf(current.netBalancePaise, current.incomeTotalPaise) : null,
    previous,
    comparison: buildComparison(current, previous),
    trend,
    hasData:
      current.incomeTotalPaise > 0 ||
      current.expenseTotalPaise > 0 ||
      goalActivity.contributionsPaise > 0 ||
      goalActivity.withdrawalsPaise > 0,
  };
}
