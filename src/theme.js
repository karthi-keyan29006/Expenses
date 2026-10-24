import { StyleSheet } from 'react-native';

export const colors = {
  background: '#F4F6FB',
  card: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  muted: '#6B7280',
  subtle: '#9CA3AF',
  primary: '#3B5BDB',
  primarySoft: '#E8EDFB',
  income: '#16A34A',
  incomeSoft: '#DCFCE7',
  expense: '#DC2626',
  expenseSoft: '#FEE2E2',
  savings: '#D97706',
  savingsSoft: '#FEF3C7',
  neutralSoft: '#F3F4F6',
  danger: '#B91C1C',
  white: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const typography = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  subheading: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  body: {
    fontSize: 15,
    color: colors.text,
  },
  caption: {
    fontSize: 13,
    color: colors.muted,
  },
  small: {
    fontSize: 12,
    color: colors.subtle,
  },
});

export const shadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
};

export const layout = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
