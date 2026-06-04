import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { Colors, Radius } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'outline' | 'dark';
  small?: boolean;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export default function Button({ label, onPress, variant = 'primary', small, loading, disabled, style }: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.btn,
        small && styles.small,
        variant === 'primary' && styles.primary,
        variant === 'ghost' && styles.ghost,
        variant === 'outline' && styles.outline,
        variant === 'dark' && styles.dark,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator color={variant === 'primary' ? '#fff' : Colors.accent} />
        : <Text style={[styles.label, small && styles.smallLabel, variant === 'ghost' && styles.ghostLabel, variant === 'outline' && styles.ghostLabel]}>
            {label}
          </Text>
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 54,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    width: '100%',
  },
  small: { height: 40, borderRadius: Radius.sm, width: 'auto' },
  primary: { backgroundColor: Colors.accent },
  ghost: { backgroundColor: Colors.surface2 },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.line2 },
  dark: { backgroundColor: Colors.ink },
  disabled: { opacity: 0.5 },
  label: { fontWeight: '600', fontSize: 16, color: Colors.white },
  ghostLabel: { color: Colors.ink },
  smallLabel: { fontSize: 14 },
});
