import { getExpensesForMonth, getExpenseTotalForMonth } from '../database/expenseRepository';
import { getGoalActivityForMonth, getGoals } from '../database/goalRepository';
import { getIncomeForMonth, getIncomeTotalForMonth } from '../database/incomeRepository';
import { percentOf } from '../utils/currency';
import { mergeTransactions } from './transactionService';

export const RECENT_TRANSACTION_LIMIT = 6;
export const DASHBOARD_GOAL_LIMIT = 3;

/** Adds progress fields to a goal row returned by the goal repository. */
export function withGoalProgress(goal) {
  const percent = percentOf(goal.balancePaise, goal.targetAmountPaise, 1);
  return {
    ...goal,
    percent,
    cappedPercent: Math.min(100, Math.max(0, percent)),
    remainingPaise: Math.max(0, goal.targetAmountPaise - goal.balancePaise),
    isComplete: goal.balancePaise >= goal.targetAmountPaise,
  };
}

/**
 * Monthly totals for the Home screen.
 *
 *   Net balance         = income - expenses
 *   Allocated to goals  = contributions - withdrawals (this month)
 *   Unallocated balance = net balance - allocated to goals
 *
 * Savings contributions are transfers into a goal, not spending, so they are
 * kept out of the expense total to avoid double counting.
 */
export async function getDashboardSummary(month) {
  const [incomeTotalPaise, expenseTotalPaise, goalActivity, incomes, expenses, goals] =
    await Promise.all([
      getIncomeTotalForMonth(month),
      getExpenseTotalForMonth(month),
      getGoalActivityForMonth(month),
      getIncomeForMonth(month),
      getExpensesForMonth(month),
      getGoals(),
    ]);

  const netBalancePaise = incomeTotalPaise - expenseTotalPaise;
  const allocatedPaise = goalActivity.netPaise;

  return {
    month,
    incomeTotalPaise,
    expenseTotalPaise,
    netBalancePaise,
    allocatedPaise,
    unallocatedPaise: netBalancePaise - allocatedPaise,
    spentPercent: percentOf(expenseTotalPaise, incomeTotalPaise),
    transactionCount: incomes.length + expenses.length,
    recentTransactions: mergeTransactions(incomes, expenses).slice(0, RECENT_TRANSACTION_LIMIT),
    goals: goals.slice(0, DASHBOARD_GOAL_LIMIT).map(withGoalProgress),
    totalGoals: goals.length,
  };
}
