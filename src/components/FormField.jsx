import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';

/** Label + control + optional hint/error, used by every form screen. */
export default function FormField({ label, hint, error, children, style }) {
  return (
    <View style={[styles.field, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {children}
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

export const inputStyles = StyleSheet.create({
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    minHeight: 48,
  },
  inputError: {
    borderColor: colors.expense,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
});

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.subheading,
    marginBottom: spacing.sm,
  },
  hint: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  error: {
    fontSize: 13,
    color: colors.expense,
    marginTop: spacing.xs,
  },
});
