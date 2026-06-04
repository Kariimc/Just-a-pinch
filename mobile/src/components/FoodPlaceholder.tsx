import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { FoodColors } from '../theme';

interface Props {
  variant?: keyof typeof FoodColors;
  style?: ViewStyle;
  children?: React.ReactNode;
}

const variants = Object.keys(FoodColors) as Array<keyof typeof FoodColors>;

export default function FoodPlaceholder({ variant, style, children }: Props) {
  const key = variant ?? variants[Math.floor(Math.random() * variants.length)];
  const { a, b } = FoodColors[key] ?? FoodColors.toast;

  return (
    <View style={[styles.base, { backgroundColor: a }, style]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: b, opacity: 0.45 }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
});
