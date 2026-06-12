import React, { useEffect, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  cancelAnimation, interpolate, useAnimatedStyle, useSharedValue,
  withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { Colors } from '../theme';
import { Ambient, Curves } from '../theme/motion';

interface Props {
  radius?: number;  // match the parent card's borderRadius
  delayMs?: number; // phase offset so neighbouring cards don't sweep together
  restMs?: number;  // pause between sweeps
  peak?: number;    // highlight intensity at the centre of the bar
}

// Periodic specular sweep for rectangular cards (the circular variant lives in
// BadgeMedallion). Absolute-fills its parent; pure transform/opacity.
export default function Sheen({
  radius = 0, delayMs = 0, restMs = Ambient.sheenRestMs * 2, peak = 0.4,
}: Props) {
  const w = useSharedValue(0);
  const p = useSharedValue(0);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  useEffect(() => {
    p.value = withRepeat(
      withDelay(
        restMs + delayMs,
        withSequence(
          withTiming(1, { duration: Ambient.sheenMs, easing: Curves.move }),
          withTiming(0, { duration: 1 }),
        ),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(p);
  }, [delayMs, restMs, p]);

  // The bar parks fully outside the clip at rest — no opacity juggling.
  const anim = useAnimatedStyle(() => ({
    width: w.value * 0.38,
    transform: [
      { translateX: interpolate(p.value, [0, 1], [-w.value * 0.6, w.value * 1.1]) },
      { rotate: '18deg' },
    ],
  }));

  return (
    <View
      pointerEvents="none"
      onLayout={e => { w.value = e.nativeEvent.layout.width; }}
      style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
    >
      <Animated.View style={[styles.bar, anim]}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id={`cardsheen${uid}`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={Colors.white} stopOpacity="0" />
              <Stop offset="0.45" stopColor={Colors.white} stopOpacity={String(peak * 0.5)} />
              <Stop offset="0.5" stopColor={Colors.white} stopOpacity={String(peak)} />
              <Stop offset="0.55" stopColor={Colors.white} stopOpacity={String(peak * 0.5)} />
              <Stop offset="1" stopColor={Colors.white} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#cardsheen${uid})`} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', top: '-25%', height: '150%' },
});
