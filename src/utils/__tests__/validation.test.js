import {
  hasErrors,
  validateExpense,
  validateGoal,
  validateGoalTransaction,
  validateIncome,
} from '../validation';

describe('validateIncome', () => {
  it('normalises a valid salary entry', () => {
    const { values, errors } = validateIncome({
      type: 'salary',
      amount: '30000',
      receivedDate: '2026-10-01',
      salaryMonth: '2026-09',
      note: '  September salary  ',
    });
    expect(hasErrors(errors)).toBe(false);
    expect(values).toEqual({
      type: 'salary',
      amountPaise: 3000000,
      receivedDate: '2026-10-01',
      salaryMonth: '2026-09',
      note: 'September salary',
    });
  });

  it('reports every invalid field', () => {
    const { errors } = validateIncome({
      type: 'tips',
      amount: '0',
      receivedDate: '2026-02-30',
      salaryMonth: '2026-14',
      note: '',
    });
    expect(Object.keys(errors).sort()).toEqual(['amount', 'receivedDate', 'salaryMonth', 'type']);
  });

  it('allows an empty salary month and note', () => {
    const { values, errors } = validateIncome({
      type: 'bonus',
      amount: '5000',
      receivedDate: '2026-10-20',
      salaryMonth: '',
      note: '',
    });
    expect(hasErrors(errors)).toBe(false);
    expect(values.salaryMonth).toBeNull();
    expect(values.note).toBeNull();
  });
});

describe('validateExpense', () => {
  it('requires amount, category and date', () => {
    const { errors } = validateExpense({ amount: 'abc', category: null, expenseDate: null });
    expect(Object.keys(errors).sort()).toEqual(['amount', 'category', 'expenseDate']);
  });

  it('normalises optional fields', () => {
    const { values, errors } = validateExpense({
      amount: '249.99',
      category: 'Food',
      expenseDate: '2026-10-24',
      paymentMethod: null,
      note: '   ',
    });
    expect(hasErrors(errors)).toBe(false);
    expect(values).toEqual({
      amountPaise: 24999,
      category: 'Food',
      expenseDate: '2026-10-24',
      paymentMethod: null,
      note: null,
    });
  });
});

describe('validateGoal', () => {
  it('accepts a goal without a target date', () => {
    const { values, errors } = validateGoal({ name: 'Emergency fund', targetAmount: '100000', targetDate: null });
    expect(hasErrors(errors)).toBe(false);
    expect(values).toEqual({ name: 'Emergency fund', targetAmountPaise: 10000000, targetDate: null });
  });

  it('rejects an empty name, zero target and bad date', () => {
    const { errors } = validateGoal({ name: ' ', targetAmount: '0', targetDate: '2026-99-99' });
    expect(Object.keys(errors).sort()).toEqual(['name', 'targetAmount', 'targetDate']);
  });
});

describe('validateGoalTransaction', () => {
  const base = { goalId: 3, transactionType: 'contribution', amount: '500', transactionDate: '2026-10-24', note: '' };

  it('accepts a contribution', () => {
    const { values, errors } = validateGoalTransaction(base, { balancePaise: 0 });
    expect(hasErrors(errors)).toBe(false);
    expect(values).toEqual({
      goalId: 3,
      transactionType: 'contribution',
      amountPaise: 50000,
      transactionDate: '2026-10-24',
      note: null,
    });
  });

  it('blocks withdrawals larger than the saved balance', () => {
    const { errors } = validateGoalTransaction(
      { ...base, transactionType: 'withdrawal', amount: '600' },
      { balancePaise: 50000 }
    );
    expect(errors.amount).toMatch('₹500');
  });

  it('allows withdrawing the full balance', () => {
    const { errors } = validateGoalTransaction(
      { ...base, transactionType: 'withdrawal', amount: '500' },
      { balancePaise: 50000 }
    );
    expect(hasErrors(errors)).toBe(false);
  });

  it('requires a goal and a known type', () => {
    const { errors } = validateGoalTransaction({ ...base, goalId: 'x', transactionType: 'transfer' });
    expect(errors.goalId).toBeDefined();
    expect(errors.transactionType).toBeDefined();
  });
});
