import {
  GOAL_TRANSACTION_TYPE_VALUES,
  INCOME_TYPE_VALUES,
  NAME_MAX_LENGTH,
  NOTE_MAX_LENGTH,
} from '../constants';
import { formatPaise, rupeesToPaise } from './currency';
import { isValidIsoDate, isValidMonth } from './dates';

// Each validator returns `{ values, errors }`. `values` holds the normalised
// record ready for the repository layer and `errors` maps field names to
// messages; the form is valid when `errors` is empty.

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}

export function validateAmount(input) {
  const paise = rupeesToPaise(input);
  if (Number.isNaN(paise)) {
    return { paise: null, error: 'Enter a valid amount (up to two decimals).' };
  }
  if (paise <= 0) {
    return { paise: null, error: 'Enter an amount greater than zero.' };
  }
  return { paise, error: null };
}

export function normalizeText(value, maxLength) {
  const text = String(value ?? '').trim();
  if (text === '') {
    return null;
  }
  return text.slice(0, maxLength);
}

export function validateIncome(data) {
  const errors = {};
  const values = {};

  if (!INCOME_TYPE_VALUES.includes(data.type)) {
    errors.type = 'Choose an income type.';
  } else {
    values.type = data.type;
  }

  const amount = validateAmount(data.amount);
  if (amount.error) {
    errors.amount = amount.error;
  } else {
    values.amountPaise = amount.paise;
  }

  if (!isValidIsoDate(data.receivedDate)) {
    errors.receivedDate = 'Choose the date the income was received.';
  } else {
    values.receivedDate = data.receivedDate;
  }

  if (data.salaryMonth == null || data.salaryMonth === '') {
    values.salaryMonth = null;
  } else if (!isValidMonth(data.salaryMonth)) {
    errors.salaryMonth = 'Choose a valid month.';
  } else {
    values.salaryMonth = data.salaryMonth;
  }

  values.note = normalizeText(data.note, NOTE_MAX_LENGTH);

  return { values, errors };
}

export function validateExpense(data) {
  const errors = {};
  const values = {};

  const amount = validateAmount(data.amount);
  if (amount.error) {
    errors.amount = amount.error;
  } else {
    values.amountPaise = amount.paise;
  }

  const category = normalizeText(data.category, NAME_MAX_LENGTH);
  if (!category) {
    errors.category = 'Choose a category.';
  } else {
    values.category = category;
  }

  if (!isValidIsoDate(data.expenseDate)) {
    errors.expenseDate = 'Choose the expense date.';
  } else {
    values.expenseDate = data.expenseDate;
  }

  values.paymentMethod = normalizeText(data.paymentMethod, NAME_MAX_LENGTH);
  values.note = normalizeText(data.note, NOTE_MAX_LENGTH);

  return { values, errors };
}

export function validateGoal(data) {
  const errors = {};
  const values = {};

  const name = normalizeText(data.name, NAME_MAX_LENGTH);
  if (!name) {
    errors.name = 'Give the goal a name.';
  } else {
    values.name = name;
  }

  const amount = validateAmount(data.targetAmount);
  if (amount.error) {
    errors.targetAmount = amount.error;
  } else {
    values.targetAmountPaise = amount.paise;
  }

  if (data.targetDate == null || data.targetDate === '') {
    values.targetDate = null;
  } else if (!isValidIsoDate(data.targetDate)) {
    errors.targetDate = 'Choose a valid target date.';
  } else {
    values.targetDate = data.targetDate;
  }

  return { values, errors };
}

export function validateGoalTransaction(data, { balancePaise = 0 } = {}) {
  const errors = {};
  const values = {};

  const goalId = Number(data.goalId);
  if (!Number.isInteger(goalId) || goalId <= 0) {
    errors.goalId = 'Choose a savings goal.';
  } else {
    values.goalId = goalId;
  }

  if (!GOAL_TRANSACTION_TYPE_VALUES.includes(data.transactionType)) {
    errors.transactionType = 'Choose contribution or withdrawal.';
  } else {
    values.transactionType = data.transactionType;
  }

  const amount = validateAmount(data.amount);
  if (amount.error) {
    errors.amount = amount.error;
  } else if (data.transactionType === 'withdrawal' && amount.paise > balancePaise) {
    errors.amount = `You can withdraw at most ${formatPaise(balancePaise)} from this goal.`;
  } else {
    values.amountPaise = amount.paise;
  }

  if (!isValidIsoDate(data.transactionDate)) {
    errors.transactionDate = 'Choose the transaction date.';
  } else {
    values.transactionDate = data.transactionDate;
  }

  values.note = normalizeText(data.note, NOTE_MAX_LENGTH);

  return { values, errors };
}
