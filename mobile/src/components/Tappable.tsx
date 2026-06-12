import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Springs } from '../theme/motion';
import { hapticLight } from '../lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  // How far the element sinks while pressed. Cards 0.97, buttons 0.96, chips 0.93.
  scaleTo?: number;
  haptic?: boolean;
  children?: React.ReactNode;
}

// Spring-driven press feedback, runs entirely on the UI thread.
export default function Tappable({ style, scaleTo = 0.97, haptic, onPressIn, onPressOut, ...rest }: Props) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      style={[style, animStyle]}
      onPressIn={e => {
        scale.value = withSpring(scaleTo, Springs.press);
        if (haptic) hapticLight();
        onPressIn?.(e);
      }}
      onPressOut={e => {
        scale.value = withSpring(1, Springs.glide);
        onPressOut?.(e);
      }}
    />
  );
}
