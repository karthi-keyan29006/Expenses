import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';
import { formatDateLabel, parseIsoDate, toIsoDate } from '../utils/dates';

/**
 * Date picker field. `value` is an ISO "YYYY-MM-DD" string (or null when
 * `allowClear` is used and nothing is chosen). Uses the native Android dialog.
 */
export default function DateField({ value, onChange, error, allowClear = false, placeholder = 'Choose a date' }) {
  const [showIosPicker, setShowIosPicker] = useState(false);
  const currentDate = parseIsoDate(value) ?? new Date();

  const handleChange = (event, selectedDate) => {
    setShowIosPicker(false);
    if (event?.type === 'set' && selectedDate) {
      onChange(toIsoDate(selectedDate));
    }
  };

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: currentDate, mode: 'date', onChange: handleChange });
    } else {
      setShowIosPicker(true);
    }
  };

  return (
    <View>
      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        style={({ pressed }) => [styles.field, error && styles.fieldError, pressed && styles.pressed]}
      >
        <Ionicons name="calendar-outline" size={20} color={colors.muted} style={styles.icon} />
        <Text style={[styles.value, !value && styles.placeholder]}>
          {value ? formatDateLabel(value) : placeholder}
        </Text>
        {allowClear && value ? (
          <Pressable onPress={() => onChange(null)} hitSlop={12} accessibilityLabel="Clear date">
            <Ionicons name="close-circle" size={20} color={colors.subtle} />
          </Pressable>
        ) : (
          <Ionicons name="chevron-down" size={18} color={colors.subtle} />
        )}
      </Pressable>
      {showIosPicker ? (
        <DateTimePicker value={currentDate} mode="date" display="inline" onChange={handleChange} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  fieldError: {
    borderColor: colors.expense,
  },
  pressed: {
    opacity: 0.8,
  },
  icon: {
    marginRight: spacing.sm,
  },
  value: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  placeholder: {
    color: colors.subtle,
  },
});
