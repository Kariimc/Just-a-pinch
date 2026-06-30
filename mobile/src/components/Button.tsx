import React from 'react';
import { Text, StyleSheet, ViewStyle, ActivityIndicator, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect } from 'react-native-svg';
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

// The same glossy brand-green treatment as the nav + orb: diagonal gradient,
// soft top-down sheen and a radial glass highlight — no hard rim line. Shared
// so every primary (green) button reads as one family with the + button.
export function GreenGloss({ radius }: { radius: number }) {
  return (
    <Svg style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' } as ViewStyle]} pointerEvents="none">
      <Defs>
        <LinearGradient id="btnOrb" x1="0" y1="0" x2="0.35" y2="1">
          <Stop offset="0" stopColor="#43C275" />
          <Stop offset="0.5" stopColor="#2E9E57" />
          <Stop offset="1" stopColor="#1C763E" />
        </LinearGradient>
        <LinearGradient id="btnTop" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.26" />
          <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.04" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
        <RadialGradient id="btnHi" cx="30%" cy="16%" r="75%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.34" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#btnOrb)" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#btnTop)" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#btnHi)" />
    </Svg>
  );
}

export default function Button({ label, onPress, variant = 'primary', small, loading, disabled, style, leadingIcon }: Props) {
  const isLight = variant === 'ghost' || variant === 'outline';
  const radius = small ? Radius.sm : Radius.md;
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
      {variant === 'primary' && !disabled && <GreenGloss radius={radius} />}
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
    overflow: 'hidden',
  },
  small: { height: 40, borderRadius: Radius.sm, width: 'auto', paddingHorizontal: 16 },
  primary: {
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32, shadowRadius: 12, elevation: 6,
  },
  ghost: { backgroundColor: Colors.surface2 },
  outline: { backgroundColor: Colors.transparent, borderWidth: 1.5, borderColor: Colors.line2 },
  dark: { backgroundColor: Colors.ink },
  disabled: { opacity: 0.5 },
  icon: { marginRight: 8, zIndex: 1 },
  label: { fontFamily: Fonts.uiSemiBold, fontSize: 16, color: Colors.white, zIndex: 1 },
  lightLabel: { color: Colors.ink },
  smallLabel: { fontSize: 14 },
});
