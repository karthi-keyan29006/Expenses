import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import AmountInput from '../../src/components/AmountInput';
import Button from '../../src/components/Button';
import ChipSelect from '../../src/components/ChipSelect';
import DateField from '../../src/components/DateField';
import { ErrorState, LoadingState } from '../../src/components/EmptyState';
import FormField from '../../src/components/FormField';
import TextField from '../../src/components/TextField';
import {
  categoryColor,
  categoryIcon,
  EXPENSE_CATEGORIES,
  NOTE_MAX_LENGTH,
  PAYMENT_METHODS,
} from '../../src/constants';
import { addExpense, deleteExpense, getExpenseById, updateExpense } from '../../src/database/expenseRepository';
import { layout, spacing } from '../../src/theme';
import { paiseToInputString } from '../../src/utils/currency';
import { todayIso } from '../../src/utils/dates';
import { hasErrors, validateExpense } from '../../src/utils/validation';

const CATEGORY_OPTIONS = EXPENSE_CATEGORIES.map((category) => ({
  value: category,
  label: category,
  color: categoryColor(category),
  icon: categoryIcon(category),
}));

export default function AddExpenseScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const expenseId = id ? Number(id) : null;
  const isEdit = Number.isInteger(expenseId) && expenseId > 0;

  const [form, setForm] = useState({
    amount: '',
    category: null,
    expenseDate: todayIso(),
    paymentMethod: null,
    note: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) {
      return;
    }
    let active = true;
    getExpenseById(expenseId)
      .then((expense) => {
        if (!active) {
          return;
        }
        if (!expense) {
          setLoadError(new Error('This expense no longer exists.'));
        } else {
          setForm({
            amount: paiseToInputString(expense.amountPaise),
            category: expense.category,
            expenseDate: expense.expenseDate,
            paymentMethod: expense.paymentMethod ?? null,
            note: expense.note ?? '',
          });
        }
        setLoading(false);
      })
      .catch((error) => {
        if (active) {
          setLoadError(error);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [isEdit, expenseId]);

  const update = (patch) => setForm((current) => ({ ...current, ...patch }));

  // A restored backup may contain a category that is not in the preset list;
  // keep it selectable so the entry can still be edited.
  const categoryOptions =
    form.category && !EXPENSE_CATEGORIES.includes(form.category)
      ? [...CATEGORY_OPTIONS, { value: form.category, label: form.category }]
      : CATEGORY_OPTIONS;

  const handleSave = async () => {
    const { values, errors: validationErrors } = validateExpense(form);
    setErrors(validationErrors);
    if (hasErrors(validationErrors)) {
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await updateExpense(expenseId, values);
      } else {
        await addExpense(values);
      }
      router.back();
    } catch (error) {
      setSaving(false);
      Alert.alert('Could not save', error.message);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete this expense?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteExpense(expenseId);
            router.back();
          } catch (error) {
            Alert.alert('Could not delete', error.message);
          }
        },
      },
    ]);
  };

  const title = isEdit ? 'Edit expense' : 'Add expense';

  if (loading || loadError) {
    return (
      <View style={layout.screen}>
        <Stack.Screen options={{ title }} />
        {loadError ? <ErrorState error={loadError} onRetry={() => router.back()} /> : <LoadingState />}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={layout.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={layout.content} keyboardShouldPersistTaps="handled">
        <FormField label="Amount" error={errors.amount}>
          <AmountInput value={form.amount} onChangeText={(amount) => update({ amount })} error={errors.amount} autoFocus={!isEdit} />
        </FormField>

        <FormField label="Category" error={errors.category}>
          <ChipSelect options={categoryOptions} value={form.category} onChange={(category) => update({ category })} />
        </FormField>

        <FormField label="Date" error={errors.expenseDate}>
          <DateField value={form.expenseDate} onChange={(expenseDate) => update({ expenseDate })} error={errors.expenseDate} />
        </FormField>

        <FormField label="Payment method (optional)">
          <ChipSelect
            options={PAYMENT_METHODS}
            value={form.paymentMethod}
            onChange={(paymentMethod) => update({ paymentMethod })}
            allowDeselect
          />
        </FormField>

        <FormField label="Description (optional)">
          <TextField
            value={form.note}
            onChangeText={(note) => update({ note })}
            placeholder="e.g. Groceries at the weekly market"
            maxLength={NOTE_MAX_LENGTH}
            multiline
          />
        </FormField>

        <Button title={isEdit ? 'Save changes' : 'Save expense'} onPress={handleSave} loading={saving} icon="checkmark" />
        {isEdit ? (
          <Button title="Delete expense" onPress={handleDelete} variant="danger" icon="trash-outline" style={styles.delete} />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  delete: {
    marginTop: spacing.md,
  },
});
