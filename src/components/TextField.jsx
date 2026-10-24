import { TextInput } from 'react-native';

import { colors } from '../theme';
import { inputStyles } from './FormField';

export default function TextField({ value, onChangeText, placeholder, error, multiline = false, maxLength, autoCapitalize = 'sentences', ...rest }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.subtle}
      multiline={multiline}
      maxLength={maxLength}
      autoCapitalize={autoCapitalize}
      style={[inputStyles.input, multiline && inputStyles.multiline, error && inputStyles.inputError]}
      {...rest}
    />
  );
}
