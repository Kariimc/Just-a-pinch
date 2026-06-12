import React, { useEffect, useId } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop,
} from 'react-native-svg';
import Animated, {
  cancelAnimation, interpolate, useAnimatedStyle, useSharedValue,
  withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { BadgeMetals, Colors } from '../theme';
import { Ambient, Curves } from '../theme/motion';
import Icon, { IconName } from './Icon';
import { BadgeMetal } from '../store/badges';

// A struck-metal medallion: polished rim, milled coin edge, dished face,
// engraved pinline and tier pips, with a specular sheen that sweeps the face
// and glitter particles that twinkle around the rim. Locked badges render in
// stone and never animate. All FX are transform/opacity on the UI thread.

type Fx = 'full' | 'sheen' | 'none';

interface Props {
  metal: BadgeMetal;
  icon: IconName;
  size?: number;
  earned?: boolean;
  fx?: Fx;            // FX budget: grids use 'sheen', heroes 'full'
  sheenDelayMs?: number; // phase offset so a grid of badges doesn't strobe in sync
}

const PIPS: Record<BadgeMetal, number> = { bronze: 1, silver: 2, gold: 3, emerald: 3 };
const PIP_X: Record<number, number[]> = { 1: [60], 2: [55.5, 64.5], 3: [51, 60, 69] };

// Glitter particles hugging the rim: position and box size as fractions of the
// medallion, plus a phase offset so they never fire together.
const TWINKLES = [
  { x: 0.14, y: 0.18, s: 0.11, delay: 0 },
  { x: 0.78, y: 0.10, s: 0.14, delay: 620 },
  { x: 0.88, y: 0.56, s: 0.09, delay: 1280 },
  { x: 0.22, y: 0.82, s: 0.12, delay: 1960 },
  { x: 0.04, y: 0.46, s: 0.08, delay: 2540 },
];

function Glint({ size, color }: { size: number; color: string }) {
  // Classic four-point lens glint.
  return (
    <Svg width={size} height={size} viewBox="-6 -6 12 12">
      <Path
        d="M0,-6 C0.9,-0.9 0.9,-0.9 6,0 C0.9,0.9 0.9,0.9 0,6 C-0.9,0.9 -0.9,0.9 -6,0 C-0.9,-0.9 -0.9,-0.9 0,-6"
        fill={color}
      />
    </Svg>
  );
}

function Twinkle({ x, y, s, delay, color }: { x: number; y: number; s: number; delay: number; color: string }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withDelay(
        delay,
        withSequence(
          withTiming(1, { duration: Ambient.twinkleInMs, easing: Curves.enter }),
          withTiming(0, { duration: Ambient.twinkleOutMs, easing: Curves.exit }),
          withDelay(Ambient.twinkleRestMs, withTiming(0, { duration: 1 })),
        ),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(t);
  }, [delay, t]);

  const anim = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ scale: 0.4 + t.value * 0.6 }, { rotate: `${t.value * 90}deg` }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x, top: y }, anim]}>
      <Glint size={s} color={color} />
    </Animated.View>
  );
}

function SheenSweep({ size, delayMs, gradId }: { size: number; delayMs: number; gradId: string }) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withRepeat(
      withDelay(
        Ambient.sheenRestMs + delayMs,
        withSequence(
          withTiming(1, { duration: Ambient.sheenMs, easing: Curves.move }),
          withTiming(0, { duration: 1 }),
        ),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(p);
  }, [delayMs, p]);

  // The bar parks outside the circular clip at rest, so no opacity juggling.
  const anim = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(p.value, [0, 1], [-size * 0.85, size * 0.85]) },
      { rotate: '24deg' },
    ],
  }));

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: size / 2, overflow: 'hidden' }]}>
      <Animated.View
        style={[
          { position: 'absolute', left: size * 0.27, top: -size * 0.25, width: size * 0.46, height: size * 1.5 },
          anim,
        ]}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={Colors.white} stopOpacity="0" />
              <Stop offset="0.42" stopColor={Colors.white} stopOpacity="0.34" />
              <Stop offset="0.5" stopColor={Colors.white} stopOpacity="0.72" />
              <Stop offset="0.58" stopColor={Colors.white} stopOpacity="0.34" />
              <Stop offset="1" stopColor={Colors.white} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${gradId})`} />
        </Svg>
      </Animated.View>
    </View>
  );
}

export default function BadgeMedallion({
  metal, icon, size = 96, earned = false, fx = 'sheen', sheenDelayMs = 0,
}: Props) {
  const palette = BadgeMetals[earned ? metal : 'stone'];
  // Gradient ids must be unique per instance (they're document-global on web).
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const pips = PIP_X[PIPS[metal]];

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        boxShadow: earned ? `0 ${size * 0.05}px ${size * 0.24}px 0 ${palette.glow}` : undefined,
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Defs>
          <LinearGradient id={`rim${uid}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.rimLight} />
            <Stop offset="0.3" stopColor={palette.rimMid} />
            <Stop offset="0.55" stopColor={palette.rimDeep} />
            <Stop offset="0.78" stopColor={palette.rimMid} />
            <Stop offset="1" stopColor={palette.rimLight} />
          </LinearGradient>
          <RadialGradient id={`face${uid}`} cx="38%" cy="30%" r="85%">
            <Stop offset="0" stopColor={palette.faceLight} />
            <Stop offset="0.55" stopColor={palette.faceMid} />
            <Stop offset="1" stopColor={palette.faceDeep} />
          </RadialGradient>
        </Defs>

        {/* Polished outer ring with a crisp struck edge */}
        <Circle cx={60} cy={60} r={57} fill={`url(#rim${uid})`} stroke={palette.edge} strokeWidth={1.5} />
        {/* Milled coin edge between rim and face */}
        <Circle
          cx={60} cy={60} r={51.5} fill="none"
          stroke={palette.rimDeep} strokeWidth={5} strokeDasharray="2.6 3.4" opacity={0.5}
        />
        {/* Dished face */}
        <Circle cx={60} cy={60} r={45} fill={`url(#face${uid})`} stroke={palette.rimLight} strokeWidth={1.2} />
        {/* Engraved pinline */}
        <Circle cx={60} cy={60} r={39.5} fill="none" stroke={palette.ink} strokeWidth={1} opacity={0.25} />
        {/* Tier pips */}
        {pips.map(x => (
          <Circle key={x} cx={x} cy={86} r={2.1} fill={palette.ink} opacity={0.5} />
        ))}
        {/* Specular highlights: key light top-left, bounce light bottom-right */}
        <Ellipse
          cx={44} cy={34} rx={23} ry={12} fill={Colors.white} opacity={0.25}
          transform="rotate(-26 44 34)"
        />
        <Ellipse
          cx={78} cy={88} rx={14} ry={7} fill={Colors.white} opacity={0.08}
          transform="rotate(-20 78 88)"
        />
      </Svg>

      {/* Engraved icon, lifted slightly to clear the tier pips */}
      <View style={[StyleSheet.absoluteFill, styles.iconWrap, { paddingBottom: size * 0.08 }]}>
        <View style={{ opacity: earned ? 1 : 0.55 }}>
          <Icon name={icon} size={size * 0.34} color={palette.ink} />
        </View>
      </View>

      {/* Locked roundel */}
      {!earned && size >= 40 && (
        <View
          style={[
            styles.lockRoundel,
            {
              width: size * 0.28, height: size * 0.28, borderRadius: size * 0.14,
              bottom: size * 0.01,
            },
          ]}
        >
          <Icon name="lock" size={size * 0.15} color={Colors.ink3} />
        </View>
      )}

      {/* Ambient FX — earned badges only */}
      {earned && fx !== 'none' && <SheenSweep size={size} delayMs={sheenDelayMs} gradId={`sheen${uid}`} />}
      {earned && fx === 'full' && TWINKLES.map((t, i) => (
        <Twinkle
          key={i}
          x={t.x * size}
          y={t.y * size}
          s={t.s * size}
          delay={t.delay}
          color={palette.sparkle}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  lockRoundel: {
    position: 'absolute', alignSelf: 'center',
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.line2,
    alignItems: 'center', justifyContent: 'center',
  },
});
