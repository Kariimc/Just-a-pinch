import React from 'react';
import { Text, StyleSheet, ViewStyle, ActivityIndicator, View } from 'react-native';
import Tappable from './Tappable';
import { Colors, Radius, Fonts } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'outline' | 'dark';
  small?: boolean;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  leadingIcon?: React.ReactNode;
}

export default function Button({ label, onPress, variant = 'primary', small, loading, disabled, style, leadingIcon }: Props) {
  const isLight = variant === 'ghost' || variant === 'outline';
  return (
    <Tappable
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
      scaleTo={0.96}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : Colors.accent} />
      ) : (
        <>
          {leadingIcon && <View style={styles.icon}>{leadingIcon}</View>}
          <Text style={[styles.label, small && styles.smallLabel, isLight && styles.lightLabel]}>
            {label}
          </Text>
        </>
      )}
    </Tappable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 54,
    borderRadius: Radius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    width: '100%',
  },
  small: { height: 40, borderRadius: Radius.sm, width: 'auto', paddingHorizontal: 16 },
  primary: { backgroundColor: Colors.accent },
  ghost: { backgroundColor: Colors.surface2 },
  outline: { backgroundColor: Colors.transparent, borderWidth: 1.5, borderColor: Colors.line2 },
  dark: { backgroundColor: Colors.ink },
  disabled: { opacity: 0.5 },
  icon: { marginRight: 8 },
  label: { fontFamily: Fonts.uiSemiBold, fontSize: 16, color: Colors.white },
  lightLabel: { color: Colors.ink },
  smallLabel: { fontSize: 14 },
});
