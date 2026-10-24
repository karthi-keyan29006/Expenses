import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, spacing } from '../theme';
import { RUPEE_SYMBOL, sanitizeAmountInput } from '../utils/currency';

/**
 * Rupee amount input. Keeps the value as a sanitised string ("1250.50") so the
 * user can type freely; convert with `rupeesToPaise` when saving.
 */
export default function AmountInput({ value, onChangeText, error, autoFocus = false, placeholder = '0' }) {
  return (
    <View style={[styles.wrapper, error && styles.wrapperError]}>
      <Text style={styles.symbol}>{RUPEE_SYMBOL}</Text>
      <TextInput
        value={value}
        onChangeText={(text) => onChangeText(sanitizeAmountInput(text))}
        keyboardType="decimal-pad"
        inputMode="decimal"
        placeholder={placeholder}
        placeholderTextColor={colors.subtle}
        autoFocus={autoFocus}
        style={styles.input}
        accessibilityLabel="Amount in rupees"
        maxLength={15}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    minHeight: 60,
  },
  wrapperError: {
    borderColor: colors.expense,
  },
  symbol: {
    fontSize: 26,
    fontWeight: '600',
    color: colors.muted,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    paddingVertical: spacing.sm,
  },
});
