import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { Colors, Radius } from '../theme';

interface Props {
  width?: ViewStyle['width'];
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

export default function Skeleton({ width = '100%', height = 16, radius = Radius.sm, style }: Props) {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: Colors.surface2, opacity: pulse },
        style,
      ]}
    />
  );
}

// Horizontal recipe-card placeholder matching RecipeCard's "horizontal" variant.
export function RecipeCardSkeleton() {
  return (
    <View style={styles.hCard}>
      <Skeleton width="100%" height={130} radius={0} />
      <View style={{ padding: 12, gap: 8 }}>
        <Skeleton width="80%" height={16} />
        <Skeleton width="55%" height={12} />
      </View>
    </View>
  );
}

// Grid tile placeholder matching RecipeCard's "grid" variant.
export function GridCardSkeleton() {
  return (
    <View style={styles.gridCard}>
      <Skeleton width="100%" height={110} radius={0} />
      <View style={{ padding: 10, gap: 7 }}>
        <Skeleton width="85%" height={13} />
        <Skeleton width="50%" height={11} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hCard: {
    width: 215,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.line,
    overflow: 'hidden',
  },
  gridCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.line,
    overflow: 'hidden',
  },
});
