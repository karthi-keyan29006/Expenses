import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import AmountInput from '../../src/components/AmountInput';
import Button from '../../src/components/Button';
import DateField from '../../src/components/DateField';
import { ErrorState, LoadingState } from '../../src/components/EmptyState';
import FormField from '../../src/components/FormField';
import TextField from '../../src/components/TextField';
import { NAME_MAX_LENGTH } from '../../src/constants';
import { createGoal, getGoalById, updateGoal } from '../../src/database/goalRepository';
import { layout } from '../../src/theme';
import { paiseToInputString } from '../../src/utils/currency';
import { hasErrors, validateGoal } from '../../src/utils/validation';

export default function AddGoalScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const goalId = id ? Number(id) : null;
  const isEdit = Number.isInteger(goalId) && goalId > 0;

  const [form, setForm] = useState({ name: '', targetAmount: '', targetDate: null });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) {
      return;
    }
    let active = true;
    getGoalById(goalId)
      .then((goal) => {
        if (!active) {
          return;
        }
        if (!goal) {
          setLoadError(new Error('This goal no longer exists.'));
        } else {
          setForm({
            name: goal.name,
            targetAmount: paiseToInputString(goal.targetAmountPaise),
            targetDate: goal.targetDate ?? null,
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
  }, [isEdit, goalId]);

  const update = (patch) => setForm((current) => ({ ...current, ...patch }));

  const handleSave = async () => {
    const { values, errors: validationErrors } = validateGoal(form);
    setErrors(validationErrors);
    if (hasErrors(validationErrors)) {
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await updateGoal(goalId, values);
        router.back();
      } else {
        const newId = await createGoal(values);
        // Land on the new goal so the first contribution is one tap away.
        router.replace(`/goals/${newId}`);
      }
    } catch (error) {
      setSaving(false);
      Alert.alert('Could not save', error.message);
    }
  };

  const title = isEdit ? 'Edit goal' : 'New savings goal';

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
        <FormField label="Goal name" error={errors.name}>
          <TextField
            value={form.name}
            onChangeText={(name) => update({ name })}
            placeholder="e.g. Emergency fund, New laptop"
            maxLength={NAME_MAX_LENGTH}
            autoCapitalize="words"
            autoFocus={!isEdit}
            error={errors.name}
          />
        </FormField>

        <FormField label="Target amount" error={errors.targetAmount}>
          <AmountInput value={form.targetAmount} onChangeText={(targetAmount) => update({ targetAmount })} error={errors.targetAmount} />
        </FormField>

        <FormField
          label="Target date (optional)"
          hint="Used to show how much to save each month to stay on track."
          error={errors.targetDate}
        >
          <DateField
            value={form.targetDate}
            onChange={(targetDate) => update({ targetDate })}
            error={errors.targetDate}
            allowClear
            placeholder="No target date"
          />
        </FormField>

        <Button title={isEdit ? 'Save changes' : 'Create goal'} onPress={handleSave} loading={saving} icon="checkmark" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
