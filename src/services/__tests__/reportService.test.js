import { withGoalProgress } from '../dashboardService';
import { buildCategoryBreakdown, buildComparison } from '../reportService';
import { groupTransactionsByDate, mergeTransactions } from '../transactionService';

// babel-jest hoists jest.mock above the imports.
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));

describe('buildComparison', () => {
  it('computes deltas and percentages against the previous month', () => {
    const current = { incomeTotalPaise: 3000000, expenseTotalPaise: 850000, netBalancePaise: 2150000 };
    const previous = { incomeTotalPaise: 2800000, expenseTotalPaise: 1000000, netBalancePaise: 1800000 };
    expect(buildComparison(current, previous)).toEqual({
      incomeDeltaPaise: 200000,
      expenseDeltaPaise: -150000,
      netDeltaPaise: 350000,
      incomeDeltaPercent: 7.1,
      expenseDeltaPercent: -15,
    });
  });

  it('leaves percentages null when there is nothing to compare against', () => {
    const current = { incomeTotalPaise: 100, expenseTotalPaise: 50, netBalancePaise: 50 };
    const previous = { incomeTotalPaise: 0, expenseTotalPaise: 0, netBalancePaise: 0 };
    const result = buildComparison(current, previous);
    expect(result.incomeDeltaPercent).toBeNull();
    expect(result.expenseDeltaPercent).toBeNull();
  });
});

describe('buildCategoryBreakdown', () => {
  it('adds percentages and colours', () => {
    const rows = [
      { category: 'Rent', totalPaise: 1000000, count: 1 },
      { category: 'Food', totalPaise: 500000, count: 12 },
      { category: 'Mystery', totalPaise: 500000, count: 1 },
    ];
    const breakdown = buildCategoryBreakdown(rows, 2000000);
    expect(breakdown.map((item) => item.percent)).toEqual([50, 25, 25]);
    expect(breakdown[0].color).toBe('#8B5CF6');
    expect(breakdown[2].color).toBe('#64748B'); // unknown categories fall back to "Other"
  });
});

describe('withGoalProgress', () => {
  it('caps the displayed percentage but keeps the real balance', () => {
    const goal = withGoalProgress({ balancePaise: 12000000, targetAmountPaise: 10000000 });
    expect(goal.percent).toBe(120);
    expect(goal.cappedPercent).toBe(100);
    expect(goal.remainingPaise).toBe(0);
    expect(goal.isComplete).toBe(true);
  });

  it('reports remaining amount for goals in progress', () => {
    const goal = withGoalProgress({ balancePaise: 2500000, targetAmountPaise: 10000000 });
    expect(goal.percent).toBe(25);
    expect(goal.remainingPaise).toBe(7500000);
    expect(goal.isComplete).toBe(false);
  });
});

describe('transaction list helpers', () => {
  const incomes = [
    { id: 1, type: 'salary', amountPaise: 3000000, receivedDate: '2026-10-01', salaryMonth: '2026-09', note: null, createdAt: '2026-10-01 05:00:00' },
  ];
  const expenses = [
    { id: 1, amountPaise: 24999, category: 'Food', expenseDate: '2026-10-02', paymentMethod: 'UPI', note: null, createdAt: '2026-10-02 05:00:00' },
    { id: 2, amountPaise: 1500000, category: 'Rent', expenseDate: '2026-10-01', paymentMethod: null, note: 'October rent', createdAt: '2026-10-01 06:00:00' },
  ];

  it('merges income and expenses newest first', () => {
    const items = mergeTransactions(incomes, expenses);
    expect(items.map((item) => item.key)).toEqual(['expense-1', 'expense-2', 'income-1']);
    expect(items[2].subtitle).toBe('For Sep 2026');
    expect(items[1].subtitle).toBe('October rent');
  });

  it('groups by date with a signed daily total', () => {
    const sections = groupTransactionsByDate(mergeTransactions(incomes, expenses));
    expect(sections.map((section) => section.date)).toEqual(['2026-10-02', '2026-10-01']);
    expect(sections[1].totalPaise).toBe(3000000 - 1500000);
    expect(sections[1].data).toHaveLength(2);
  });
});
