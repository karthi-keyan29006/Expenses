export const INCOME_TYPES = [
  { value: 'salary', label: 'Salary' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'other', label: 'Other' },
];

export const INCOME_TYPE_VALUES = INCOME_TYPES.map((type) => type.value);

export const EXPENSE_CATEGORIES = [
  'Food',
  'Travel',
  'Rent',
  'Bills',
  'Shopping',
  'Health',
  'Entertainment',
  'Other',
];

export const CATEGORY_COLORS = {
  Food: '#F97316',
  Travel: '#0EA5E9',
  Rent: '#8B5CF6',
  Bills: '#EAB308',
  Shopping: '#EC4899',
  Health: '#10B981',
  Entertainment: '#6366F1',
  Other: '#64748B',
};

export const CATEGORY_ICONS = {
  Food: 'fast-food-outline',
  Travel: 'bus-outline',
  Rent: 'home-outline',
  Bills: 'receipt-outline',
  Shopping: 'bag-handle-outline',
  Health: 'medkit-outline',
  Entertainment: 'game-controller-outline',
  Other: 'ellipsis-horizontal-circle-outline',
};

export const INCOME_ICONS = {
  salary: 'wallet-outline',
  bonus: 'gift-outline',
  other: 'cash-outline',
};

export const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Bank transfer', 'Other'];

export const GOAL_TRANSACTION_TYPES = [
  { value: 'contribution', label: 'Contribution' },
  { value: 'withdrawal', label: 'Withdrawal' },
];

export const GOAL_TRANSACTION_TYPE_VALUES = GOAL_TRANSACTION_TYPES.map((type) => type.value);

export const SETTINGS_KEYS = {
  lastBackupAt: 'last_backup_at',
};

export const BACKUP_FORMAT = 'salary-expense-backup';
export const BACKUP_VERSION = 1;

export const NOTE_MAX_LENGTH = 200;
export const NAME_MAX_LENGTH = 60;

export function categoryColor(category) {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Other;
}

export function categoryIcon(category) {
  return CATEGORY_ICONS[category] ?? CATEGORY_ICONS.Other;
}

export function incomeTypeLabel(type) {
  return INCOME_TYPES.find((item) => item.value === type)?.label ?? 'Income';
}
