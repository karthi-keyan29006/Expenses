import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import AmountInput from '../../src/components/AmountInput';
import Button from '../../src/components/Button';
import Card from '../../src/components/Card';
import ChipSelect from '../../src/components/ChipSelect';
import DateField from '../../src/components/DateField';
import EmptyState, { ErrorState, LoadingState } from '../../src/components/EmptyState';
import FormField from '../../src/components/FormField';
import ProgressBar from '../../src/components/ProgressBar';
import TextField from '../../src/components/TextField';
import { GOAL_TRANSACTION_TYPES, NOTE_MAX_LENGTH } from '../../src/constants';
import { addGoalTransaction, getGoals } from '../../src/database/goalRepository';
import { withGoalProgress } from '../../src/services/dashboardService';
import { colors, layout, spacing } from '../../src/theme';
import { formatPaise } from '../../src/utils/currency';
import { todayIso } from '../../src/utils/dates';
import { hasErrors, validateGoalTransaction } from '../../src/utils/validation';

const TYPE_OPTIONS = GOAL_TRANSACTION_TYPES.map((type) => ({
  ...type,
  icon: type.value === 'contribution' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline',
  color: type.value === 'contribution' ? colors.income : colors.expense,
}));

/**
 * Records a contribution to, or withdrawal from, a savings goal.
 * Params: `goalId` (optional – otherwise the user picks a goal) and `type`.
 */
export default function AddGoalTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const presetGoalId = params.goalId ? Number(params.goalId) : null;
  const presetType = params.type === 'withdrawal' ? 'withdrawal' : 'contribution';

  const [goals, setGoals] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState({
    goalId: presetGoalId,
    transactionType: presetType,
    amount: '',
    transactionDate: todayIso(),
    note: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getGoals({ includeArchived: Boolean(presetGoalId) })
      .then((rows) => {
        if (!active) {
          return;
        }
        const list = rows.map(withGoalProgress);
        setGoals(list);
        setForm((current) => ({
          ...current,
          // Default to the only goal when there is just one to choose from.
          goalId: current.goalId ?? (list.length === 1 ? list[0].id : null),
        }));
      })
      .catch((error) => active && setLoadError(error));
    return () => {
      active = false;
    };
  }, [presetGoalId]);

  const selectedGoal = useMemo(
    () => goals?.find((goal) => goal.id === form.goalId) ?? null,
    [goals, form.goalId]
  );

  const update = (patch) => setForm((current) => ({ ...current, ...patch }));

  const handleSave = async () => {
    const { values, errors: validationErrors } = validateGoalTransaction(form, {
      balancePaise: selectedGoal?.balancePaise ?? 0,
    });
    setErrors(validationErrors);
    if (hasErrors(validationErrors)) {
      return;
    }
    setSaving(true);
    try {
      await addGoalTransaction(values);
      router.back();
    } catch (error) {
      setSaving(false);
      Alert.alert('Could not save', error.message);
    }
  };

  const isWithdrawal = form.transactionType === 'withdrawal';
  const title = isWithdrawal ? 'Withdraw from goal' : 'Add to savings';

  if (loadError) {
    return (
      <View style={layout.screen}>
        <Stack.Screen options={{ title }} />
        <ErrorState error={loadError} onRetry={() => router.back()} />
      </View>
    );
  }

  if (!goals) {
    return (
      <View style={layout.screen}>
        <Stack.Screen options={{ title }} />
        <LoadingState />
      </View>
    );
  }

  if (goals.length === 0) {
    return (
      <View style={layout.screen}>
        <Stack.Screen options={{ title }} />
        <EmptyState
          icon="flag-outline"
          title="Create a goal first"
          message="Savings are recorded against a goal, such as an emergency fund."
          actionTitle="Create a goal"
          onAction={() => router.replace('/goals/add-goal')}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={layout.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={layout.content} keyboardShouldPersistTaps="handled">
        <FormField label="Type">
          <ChipSelect
            options={TYPE_OPTIONS}
            value={form.transactionType}
            onChange={(transactionType) => update({ transactionType })}
          />
        </FormField>

        {presetGoalId && selectedGoal ? null : (
          <FormField label="Goal" error={errors.goalId}>
            <ChipSelect
              options={goals.map((goal) => ({ value: goal.id, label: goal.name, color: colors.savings }))}
              value={form.goalId}
              onChange={(goalId) => update({ goalId })}
            />
          </FormField>
        )}

        {selectedGoal ? (
          <Card style={styles.goalCard}>
            <Text style={styles.goalName}>{selectedGoal.name}</Text>
            <ProgressBar
              percent={selectedGoal.cappedPercent}
              color={selectedGoal.isComplete ? colors.income : colors.savings}
              style={styles.goalBar}
            />
            <Text style={styles.goalMeta}>
              {formatPaise(selectedGoal.balancePaise)} saved of {formatPaise(selectedGoal.targetAmountPaise)}
              {isWithdrawal ? ` · up to ${formatPaise(selectedGoal.balancePaise)} available` : ''}
            </Text>
          </Card>
        ) : null}

        <FormField label="Amount" error={errors.amount}>
          <AmountInput value={form.amount} onChangeText={(amount) => update({ amount })} error={errors.amount} autoFocus />
        </FormField>

        <FormField label="Date" error={errors.transactionDate}>
          <DateField
            value={form.transactionDate}
            onChange={(transactionDate) => update({ transactionDate })}
            error={errors.transactionDate}
          />
        </FormField>

        <FormField label="Notes (optional)">
          <TextField
            value={form.note}
            onChangeText={(note) => update({ note })}
            placeholder={isWithdrawal ? 'e.g. Used for medical bill' : 'e.g. From October salary'}
            maxLength={NOTE_MAX_LENGTH}
            multiline
          />
        </FormField>

        <Button
          title={isWithdrawal ? 'Record withdrawal' : 'Add contribution'}
          onPress={handleSave}
          loading={saving}
          icon="checkmark"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  goalCard: {
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  goalName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  goalBar: {
    marginTop: spacing.sm,
  },
  goalMeta: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.muted,
  },
});
