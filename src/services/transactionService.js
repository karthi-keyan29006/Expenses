import { categoryColor, categoryIcon, INCOME_ICONS, incomeTypeLabel } from '../constants';
import { getExpensesForMonth } from '../database/expenseRepository';
import { getIncomeForMonth } from '../database/incomeRepository';
import { colors } from '../theme';
import { formatMonthLabel, monthOf } from '../utils/dates';

// Income and expenses live in separate tables for clear reporting. The list
// screens show them together, so these helpers map both into one shape:
// { key, kind, id, amountPaise, date, title, subtitle, icon, color, raw }.

export function toIncomeItem(income) {
  const receivedMonth = monthOf(income.receivedDate);
  const belongsElsewhere = income.salaryMonth && income.salaryMonth !== receivedMonth;
  const subtitleParts = [];
  if (belongsElsewhere) {
    subtitleParts.push(`For ${formatMonthLabel(income.salaryMonth, { short: true })}`);
  }
  if (income.note) {
    subtitleParts.push(income.note);
  }
  return {
    key: `income-${income.id}`,
    kind: 'income',
    id: income.id,
    amountPaise: Number(income.amountPaise),
    date: income.receivedDate,
    title: incomeTypeLabel(income.type),
    subtitle: subtitleParts.join(' · '),
    icon: INCOME_ICONS[income.type] ?? INCOME_ICONS.other,
    color: colors.income,
    createdAt: income.createdAt,
    raw: income,
  };
}

export function toExpenseItem(expense) {
  const subtitleParts = [];
  if (expense.paymentMethod) {
    subtitleParts.push(expense.paymentMethod);
  }
  if (expense.note) {
    subtitleParts.push(expense.note);
  }
  return {
    key: `expense-${expense.id}`,
    kind: 'expense',
    id: expense.id,
    amountPaise: Number(expense.amountPaise),
    date: expense.expenseDate,
    title: expense.category,
    subtitle: subtitleParts.join(' · '),
    icon: categoryIcon(expense.category),
    color: categoryColor(expense.category),
    createdAt: expense.createdAt,
    raw: expense,
  };
}

/** Newest first: by date, then by creation time, then by id. */
export function sortTransactions(items) {
  return [...items].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date < b.date ? 1 : -1;
    }
    const createdA = a.createdAt ?? '';
    const createdB = b.createdAt ?? '';
    if (createdA !== createdB) {
      return createdA < createdB ? 1 : -1;
    }
    return b.id - a.id;
  });
}

export function mergeTransactions(incomes, expenses) {
  return sortTransactions([...incomes.map(toIncomeItem), ...expenses.map(toExpenseItem)]);
}

/**
 * Loads a month's income and expenses as one sorted list.
 * `kind` can be 'all', 'income' or 'expense'; `category` filters expenses.
 */
export async function getTransactions(month, { kind = 'all', category = null } = {}) {
  const wantIncome = kind === 'all' || kind === 'income';
  const wantExpense = kind === 'all' || kind === 'expense';
  const [incomes, expenses] = await Promise.all([
    wantIncome && !category ? getIncomeForMonth(month) : Promise.resolve([]),
    wantExpense ? getExpensesForMonth(month, { category }) : Promise.resolve([]),
  ]);
  return mergeTransactions(incomes, expenses);
}

/** Groups a sorted transaction list into SectionList sections by date. */
export function groupTransactionsByDate(items) {
  const sections = [];
  let current = null;
  for (const item of items) {
    if (!current || current.date !== item.date) {
      current = { date: item.date, title: item.date, data: [], totalPaise: 0 };
      sections.push(current);
    }
    current.data.push(item);
    current.totalPaise += item.kind === 'income' ? item.amountPaise : -item.amountPaise;
  }
  return sections;
}
