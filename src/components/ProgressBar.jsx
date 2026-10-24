import { StyleSheet, View } from 'react-native';

import { colors, radius } from '../theme';

export default function ProgressBar({ percent, color = colors.savings, height = 8, style }) {
  const width = Math.min(100, Math.max(0, Number(percent) || 0));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }, style]}>
      <View style={[styles.fill, { width: `${width}%`, backgroundColor: color, borderRadius: height / 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: colors.neutralSoft,
    overflow: 'hidden',
    borderRadius: radius.pill,
  },
  fill: {
    height: '100%',
  },
});
