import React, { useEffect, useRef } from 'react';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence, ZoomIn,
} from 'react-native-reanimated';
import { Colors } from '../theme';
import { Springs } from '../theme/motion';
import Icon from './Icon';

interface Props {
  checked: boolean;
  size?: number;
  radius?: number;
  borderColor?: string;
  fillColor?: string;
}

// Checkbox with a satisfying pop: the box swells past rest (1 → 1.14 → 1)
// while the checkmark zooms in with the same spring.
export default function AnimatedCheck({
  checked,
  size = 24,
  radius = 7,
  borderColor = Colors.line2,
  fillColor = Colors.accent,
}: Props) {
  const scale = useSharedValue(1);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    if (checked) {
      scale.value = withSequence(withSpring(1.14, Springs.pop), withSpring(1, Springs.press));
    }
  }, [checked, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: size, height: size, borderRadius: radius, borderWidth: 2,
          alignItems: 'center', justifyContent: 'center',
          borderColor: checked ? fillColor : borderColor,
          backgroundColor: checked ? fillColor : 'transparent',
        },
        animStyle,
      ]}
    >
      {checked && (
        <Animated.View entering={ZoomIn.springify().damping(14).stiffness(340).mass(0.9)}>
          <Icon name="check" size={Math.round(size * 0.62)} color="#fff" />
        </Animated.View>
      )}
    </Animated.View>
  );
}
