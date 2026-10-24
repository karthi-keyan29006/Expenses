import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import AmountInput from '../../src/components/AmountInput';
import Button from '../../src/components/Button';
import ChipSelect from '../../src/components/ChipSelect';
import DateField from '../../src/components/DateField';
import { ErrorState, LoadingState } from '../../src/components/EmptyState';
import FormField from '../../src/components/FormField';
import MonthSelector from '../../src/components/MonthSelector';
import TextField from '../../src/components/TextField';
import { INCOME_ICONS, INCOME_TYPES, NOTE_MAX_LENGTH } from '../../src/constants';
import { addIncome, deleteIncome, getIncomeById, updateIncome } from '../../src/database/incomeRepository';
import { colors, layout, spacing } from '../../src/theme';
import { paiseToInputString } from '../../src/utils/currency';
import { monthOf, todayIso } from '../../src/utils/dates';
import { hasErrors, validateIncome } from '../../src/utils/validation';

const TYPE_OPTIONS = INCOME_TYPES.map((type) => ({
  ...type,
  icon: INCOME_ICONS[type.value],
  color: colors.income,
}));

export default function AddIncomeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const incomeId = id ? Number(id) : null;
  const isEdit = Number.isInteger(incomeId) && incomeId > 0;

  const [form, setForm] = useState(() => {
    const today = todayIso();
    return { type: 'salary', amount: '', receivedDate: today, salaryMonth: monthOf(today), note: '' };
  });
  const [monthTouched, setMonthTouched] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) {
      return;
    }
    let active = true;
    getIncomeById(incomeId)
      .then((income) => {
        if (!active) {
          return;
        }
        if (!income) {
          setLoadError(new Error('This income entry no longer exists.'));
        } else {
          setForm({
            type: income.type,
            amount: paiseToInputString(income.amountPaise),
            receivedDate: income.receivedDate,
            salaryMonth: income.salaryMonth ?? monthOf(income.receivedDate),
            note: income.note ?? '',
          });
          setMonthTouched(true);
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
  }, [isEdit, incomeId]);

  const update = (patch) => setForm((current) => ({ ...current, ...patch }));

  const handleDateChange = (receivedDate) => {
    // Keep the "applies to" month in step with the received date until the
    // user picks a month deliberately (e.g. a late salary for last month).
    update(monthTouched ? { receivedDate } : { receivedDate, salaryMonth: monthOf(receivedDate) });
  };

  const handleSave = async () => {
    const { values, errors: validationErrors } = validateIncome(form);
    setErrors(validationErrors);
    if (hasErrors(validationErrors)) {
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await updateIncome(incomeId, values);
      } else {
        await addIncome(values);
      }
      router.back();
    } catch (error) {
      setSaving(false);
      Alert.alert('Could not save', error.message);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete this income?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteIncome(incomeId);
            router.back();
          } catch (error) {
            Alert.alert('Could not delete', error.message);
          }
        },
      },
    ]);
  };

  const title = isEdit ? 'Edit income' : 'Add income';

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
        <FormField label="Income type" error={errors.type}>
          <ChipSelect options={TYPE_OPTIONS} value={form.type} onChange={(type) => update({ type })} />
        </FormField>

        <FormField label="Amount" error={errors.amount}>
          <AmountInput value={form.amount} onChangeText={(amount) => update({ amount })} error={errors.amount} autoFocus={!isEdit} />
        </FormField>

        <FormField label="Date received" error={errors.receivedDate}>
          <DateField value={form.receivedDate} onChange={handleDateChange} error={errors.receivedDate} />
        </FormField>

        <FormField
          label={form.type === 'salary' ? 'Salary month' : 'Applies to month'}
          hint="Reports count this income in the month chosen here, even if it arrived late."
          error={errors.salaryMonth}
        >
          <MonthSelector
            month={form.salaryMonth}
            onChange={(salaryMonth) => {
              setMonthTouched(true);
              update({ salaryMonth });
            }}
          />
        </FormField>

        <FormField label="Notes (optional)">
          <TextField
            value={form.note}
            onChangeText={(note) => update({ note })}
            placeholder="e.g. October salary, Diwali bonus"
            maxLength={NOTE_MAX_LENGTH}
            multiline
          />
        </FormField>

        <Button title={isEdit ? 'Save changes' : 'Save income'} onPress={handleSave} loading={saving} icon="checkmark" />
        {isEdit ? (
          <Button title="Delete income" onPress={handleDelete} variant="danger" icon="trash-outline" style={styles.delete} />
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
