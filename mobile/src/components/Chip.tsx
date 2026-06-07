import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Fonts } from '../theme';

interface Props {
  label: string;
  active?: boolean;
  soft?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export default function Chip({ label, active, soft, onPress, style }: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        active && styles.active,
        soft && styles.soft,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.label, active && styles.activeLabel, soft && styles.softLabel]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 36,
    paddingHorizontal: 15,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.line2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  active: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  soft: {
    backgroundColor: Colors.accentSoft,
    borderColor: 'transparent',
  },
  label: {
    fontFamily: Fonts.uiMedium,
    fontSize: 13.5,
    color: Colors.ink,
  },
  activeLabel: { color: Colors.white },
  softLabel: { color: Colors.accentInk },
});
