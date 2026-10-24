import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

/**
 * Single-select chips. `options` are `{ value, label, color?, icon? }` objects
 * or plain strings. Set `allowDeselect` to let the user clear the selection,
 * and `scroll` to lay chips out in one horizontally scrolling row.
 */
export default function ChipSelect({
  options,
  value,
  onChange,
  allowDeselect = false,
  scroll = false,
  accentColor = colors.primary,
}) {
  const items = options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option
  );

  const chips = items.map((option) => {
    const selected = option.value === value;
    const color = option.color ?? accentColor;
    return (
      <Pressable
        key={String(option.value)}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={() => onChange(selected && allowDeselect ? null : option.value)}
        style={({ pressed }) => [
          styles.chip,
          selected && { backgroundColor: color, borderColor: color },
          pressed && styles.pressed,
        ]}
      >
        {option.icon ? (
          <Ionicons
            name={option.icon}
            size={16}
            color={selected ? colors.white : color}
            style={styles.icon}
          />
        ) : null}
        <Text style={[styles.label, selected && styles.selectedLabel]}>{option.label}</Text>
      </Pressable>
    );
  });

  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollRow}
      >
        {chips}
      </ScrollView>
    );
  }

  return <View style={styles.wrap}>{chips}</View>;
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  scrollRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    minHeight: 38,
  },
  pressed: {
    opacity: 0.8,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  selectedLabel: {
    color: colors.white,
  },
});
