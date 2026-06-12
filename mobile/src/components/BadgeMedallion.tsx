import React, { useEffect, useId } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Circle, Defs, Ellipse, LinearGradient, Path, Polygon,
  RadialGradient, Rect, Stop,
} from 'react-native-svg';
import Animated, {
  cancelAnimation, interpolate, useAnimatedStyle, useSharedValue,
  withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { BadgeMetals, Colors } from '../theme';
import { Ambient, Curves } from '../theme/motion';
import Icon, { IconName } from './Icon';
import { BadgeMetal } from '../store/badges';

// Four distinct badge shapes:
//   bronze  → coin pendant (circle + bail ring at top, like a charm)
//   silver  → heraldic shield (rectangle top, pointed at bottom)
//   gold    → trophy cup (trapezoid + handles + stem + base)
//   emerald → 8-pointed sunburst star
// All shapes keep the same metallic palette + sheen/twinkle FX system.

type Fx = 'full' | 'sheen' | 'none';

interface Props {
  metal: BadgeMetal;
  icon: IconName;
  size?: number;
  earned?: boolean;
  fx?: Fx;
  sheenDelayMs?: number;
}

const PIPS: Record<BadgeMetal, number> = { bronze: 1, silver: 2, gold: 3, emerald: 3 };
const PIP_X: Record<number, number[]> = { 1: [60], 2: [55.5, 64.5], 3: [51, 60, 69] };

// 8-pointed star polygon points (outer r=50, inner r=22, center 60,60)
const STAR_OUTER = '60,10 68.4,39.7 95.4,24.6 80.3,51.6 110,60 80.3,68.4 95.4,95.4 68.4,80.3 60,110 51.6,80.3 24.6,95.4 39.7,68.4 10,60 39.7,51.6 24.6,24.6 51.6,39.7';
// Inner star (75% scale from center): outer r=37.5, inner r=16.5
const STAR_FACE = '60,22.5 66.3,44.8 86.6,33.5 75.2,53.7 97.5,60 75.2,66.3 86.6,86.6 66.3,75.2 60,97.5 53.7,75.2 33.5,86.6 44.8,66.3 22.5,60 44.8,53.7 33.5,33.5 53.7,44.8';

// How much to translateY the icon from container center (fraction of size)
// positive = shift down, negative = shift up
const ICON_TRANSLATE: Record<BadgeMetal, number> = {
  bronze: 0.067,   // coin face center is at cy=68, 8px below viewBox center (60)
  silver: 0,       // shield visual center ≈ viewBox center
  gold: -0.14,     // cup face center is at ~y=42, 18px above viewBox center
  emerald: 0,      // star centered at viewBox center
};

// SheenSweep clip radius approximation per shape
const SHEEN_CLIP: Record<BadgeMetal, (s: number) => number> = {
  bronze: s => s * 0.5,
  silver: s => s * 0.08,
  gold: s => s * 0.10,
  emerald: s => s * 0.5,
};

// ─── Particle FX ─────────────────────────────────────────────────────────────

const TWINKLES = [
  { x: 0.14, y: 0.18, s: 0.11, delay: 0 },
  { x: 0.78, y: 0.10, s: 0.14, delay: 620 },
  { x: 0.88, y: 0.56, s: 0.09, delay: 1280 },
  { x: 0.22, y: 0.82, s: 0.12, delay: 1960 },
  { x: 0.04, y: 0.46, s: 0.08, delay: 2540 },
];

function Glint({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="-6 -6 12 12">
      <Path d="M0,-6 C0.9,-0.9 0.9,-0.9 6,0 C0.9,0.9 0.9,0.9 0,6 C-0.9,0.9 -0.9,0.9 -6,0 C-0.9,-0.9 -0.9,-0.9 0,-6" fill={color} />
    </Svg>
  );
}

function Twinkle({ x, y, s, delay, color }: { x: number; y: number; s: number; delay: number; color: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(
      withDelay(delay, withSequence(
        withTiming(1, { duration: Ambient.twinkleInMs, easing: Curves.enter }),
        withTiming(0, { duration: Ambient.twinkleOutMs, easing: Curves.exit }),
        withDelay(Ambient.twinkleRestMs, withTiming(0, { duration: 1 })),
      )),
      -1, false,
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

function SheenSweep({ size, delayMs, gradId, clipRadius }: { size: number; delayMs: number; gradId: string; clipRadius: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(
      withDelay(Ambient.sheenRestMs + delayMs, withSequence(
        withTiming(1, { duration: Ambient.sheenMs, easing: Curves.move }),
        withTiming(0, { duration: 1 }),
      )),
      -1, false,
    );
    return () => cancelAnimation(p);
  }, [delayMs, p]);
  const anim = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(p.value, [0, 1], [-size * 0.85, size * 0.85]) },
      { rotate: '24deg' },
    ],
  }));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: clipRadius, overflow: 'hidden' }]}>
      <Animated.View style={[
        { position: 'absolute', left: size * 0.27, top: -size * 0.25, width: size * 0.46, height: size * 1.5 },
        anim,
      ]}>
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

// ─── Badge face SVGs ──────────────────────────────────────────────────────────

function BronzeSvg({ uid, palette, size, pips }: { uid: string; palette: any; size: number; pips: number[] }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id={`rim${uid}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={palette.rimLight} />
          <Stop offset="0.3" stopColor={palette.rimMid} />
          <Stop offset="0.55" stopColor={palette.rimDeep} />
          <Stop offset="0.78" stopColor={palette.rimMid} />
          <Stop offset="1" stopColor={palette.rimLight} />
        </LinearGradient>
        <RadialGradient id={`face${uid}`} cx="38%" cy="32%" r="85%">
          <Stop offset="0" stopColor={palette.faceLight} />
          <Stop offset="0.55" stopColor={palette.faceMid} />
          <Stop offset="1" stopColor={palette.faceDeep} />
        </RadialGradient>
      </Defs>
      {/* Bail ring at top — the charm pendant loop */}
      <Ellipse cx={60} cy={17} rx={11} ry={13} fill={`url(#rim${uid})`} stroke={palette.edge} strokeWidth={1.2} />
      <Ellipse cx={60} cy={17} rx={6} ry={7.5} fill={Colors.paper} />
      {/* Connector strip bridging bail to coin */}
      <Rect x={53} y={16} width={14} height={16} fill={`url(#rim${uid})`} />
      {/* Outer coin rim */}
      <Circle cx={60} cy={68} r={47} fill={`url(#rim${uid})`} stroke={palette.edge} strokeWidth={1.5} />
      {/* Milled coin edge */}
      <Circle cx={60} cy={68} r={41.5} fill="none" stroke={palette.rimDeep} strokeWidth={5} strokeDasharray="2.6 3.4" opacity={0.5} />
      {/* Dished face */}
      <Circle cx={60} cy={68} r={35} fill={`url(#face${uid})`} stroke={palette.rimLight} strokeWidth={1.2} />
      {/* Engraved pinline */}
      <Circle cx={60} cy={68} r={29} fill="none" stroke={palette.ink} strokeWidth={1} opacity={0.25} />
      {/* Tier pips */}
      {pips.map(x => <Circle key={x} cx={x} cy={95} r={2.1} fill={palette.ink} opacity={0.5} />)}
      {/* Specular highlight */}
      <Ellipse cx={44} cy={46} rx={21} ry={9} fill={Colors.white} opacity={0.22} transform="rotate(-28 44 46)" />
    </Svg>
  );
}

function SilverSvg({ uid, palette, size, pips }: { uid: string; palette: any; size: number; pips: number[] }) {
  const rim  = 'M14,14 L106,14 L106,76 Q106,105 60,116 Q14,105 14,76 Z';
  const mid  = 'M19,19 L101,19 L101,74 Q101,99 60,110 Q19,99 19,74 Z';
  const face = 'M24,24 L96,24 L96,72 Q96,94 60,104 Q24,94 24,72 Z';
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id={`rim${uid}`} x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor={palette.rimLight} />
          <Stop offset="0.35" stopColor={palette.rimMid} />
          <Stop offset="0.6" stopColor={palette.rimDeep} />
          <Stop offset="0.85" stopColor={palette.rimMid} />
          <Stop offset="1" stopColor={palette.rimLight} />
        </LinearGradient>
        <RadialGradient id={`face${uid}`} cx="35%" cy="28%" r="85%">
          <Stop offset="0" stopColor={palette.faceLight} />
          <Stop offset="0.55" stopColor={palette.faceMid} />
          <Stop offset="1" stopColor={palette.faceDeep} />
        </RadialGradient>
      </Defs>
      {/* Outer shield rim */}
      <Path d={rim} fill={`url(#rim${uid})`} stroke={palette.edge} strokeWidth={1.5} />
      {/* Milled inner ring */}
      <Path d={mid} fill="none" stroke={palette.rimDeep} strokeWidth={4} opacity={0.4} />
      {/* Shield face */}
      <Path d={face} fill={`url(#face${uid})`} stroke={palette.rimLight} strokeWidth={1} />
      {/* Heraldic dividers (horizontal + vertical cross) */}
      <Path d="M24,60 L96,60" stroke={palette.ink} strokeWidth={0.9} opacity={0.2} />
      <Path d="M60,24 L60,94" stroke={palette.ink} strokeWidth={0.9} opacity={0.2} />
      {/* Inner pinline border */}
      <Path d="M28,28 L92,28 L92,70 Q92,90 60,100 Q28,90 28,70 Z" fill="none" stroke={palette.ink} strokeWidth={0.8} opacity={0.18} />
      {/* Tier pips near shield tip */}
      {pips.map(x => <Circle key={x} cx={x} cy={107} r={2} fill={palette.ink} opacity={0.5} />)}
      {/* Specular highlight */}
      <Ellipse cx={41} cy={37} rx={18} ry={8} fill={Colors.white} opacity={0.22} transform="rotate(-20 41 37)" />
    </Svg>
  );
}

function GoldSvg({ uid, palette, size, pips }: { uid: string; palette: any; size: number; pips: number[] }) {
  const cupOuter = 'M22,14 L98,14 Q102,14 102,19 L93,68 Q92,73 87,73 L33,73 Q28,73 27,68 L18,19 Q18,14 22,14 Z';
  const cupFace  = 'M27,19 L93,19 L88,67 L32,67 Z';
  const handleL  = 'M18,30 Q3,38 3,54 Q3,68 18,62';
  const handleR  = 'M102,30 Q117,38 117,54 Q117,68 102,62';
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id={`rim${uid}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={palette.rimLight} />
          <Stop offset="0.35" stopColor={palette.rimMid} />
          <Stop offset="0.6" stopColor={palette.rimDeep} />
          <Stop offset="0.85" stopColor={palette.rimMid} />
          <Stop offset="1" stopColor={palette.rimLight} />
        </LinearGradient>
        <RadialGradient id={`face${uid}`} cx="35%" cy="25%" r="90%">
          <Stop offset="0" stopColor={palette.faceLight} />
          <Stop offset="0.55" stopColor={palette.faceMid} />
          <Stop offset="1" stopColor={palette.faceDeep} />
        </RadialGradient>
        <LinearGradient id={`base${uid}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={palette.rimMid} />
          <Stop offset="0.5" stopColor={palette.rimLight} />
          <Stop offset="1" stopColor={palette.rimMid} />
        </LinearGradient>
      </Defs>
      {/* Handles (rendered first — behind cup) */}
      <Path d={handleL} stroke={`url(#rim${uid})`} strokeWidth={9} fill="none" strokeLinecap="round" />
      <Path d={handleR} stroke={`url(#rim${uid})`} strokeWidth={9} fill="none" strokeLinecap="round" />
      <Path d={handleL} stroke={palette.rimDeep} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.35} />
      <Path d={handleR} stroke={palette.rimDeep} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.35} />
      {/* Cup body */}
      <Path d={cupOuter} fill={`url(#rim${uid})`} stroke={palette.edge} strokeWidth={1.5} />
      {/* Cup face */}
      <Path d={cupFace} fill={`url(#face${uid})`} />
      {/* Cup opening highlight line */}
      <Path d="M29,21 L91,21" stroke={palette.rimLight} strokeWidth={1.5} opacity={0.55} />
      {/* Pinline inside cup */}
      <Path d="M32,25 L88,25 L84,64 L36,64 Z" fill="none" stroke={palette.ink} strokeWidth={0.8} opacity={0.18} />
      {/* Stem */}
      <Rect x={52} y={73} width={16} height={17} fill={`url(#rim${uid})`} rx={2} />
      <Rect x={55} y={73} width={10} height={17} fill={`url(#face${uid})`} />
      {/* Base plate */}
      <Rect x={26} y={88} width={68} height={16} fill={`url(#rim${uid})`} rx={5} stroke={palette.edge} strokeWidth={1} />
      <Rect x={30} y={91} width={60} height={10} fill={`url(#base${uid})`} rx={3} />
      {/* Tier pips on base */}
      {pips.map(x => <Circle key={x} cx={x} cy={99} r={2} fill={palette.edge} opacity={0.7} />)}
      {/* Specular highlight on cup face */}
      <Ellipse cx={42} cy={30} rx={16} ry={7} fill={Colors.white} opacity={0.22} transform="rotate(-18 42 30)" />
    </Svg>
  );
}

function EmeraldSvg({ uid, palette, size, pips }: { uid: string; palette: any; size: number; pips: number[] }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id={`rim${uid}`} x1="0.2" y1="0.1" x2="0.8" y2="0.9">
          <Stop offset="0" stopColor={palette.rimLight} />
          <Stop offset="0.35" stopColor={palette.rimMid} />
          <Stop offset="0.6" stopColor={palette.rimDeep} />
          <Stop offset="0.85" stopColor={palette.rimMid} />
          <Stop offset="1" stopColor={palette.rimLight} />
        </LinearGradient>
        <RadialGradient id={`face${uid}`} cx="36%" cy="28%" r="85%">
          <Stop offset="0" stopColor={palette.faceLight} />
          <Stop offset="0.55" stopColor={palette.faceMid} />
          <Stop offset="1" stopColor={palette.faceDeep} />
        </RadialGradient>
      </Defs>
      {/* Outer star rim */}
      <Polygon points={STAR_OUTER} fill={`url(#rim${uid})`} stroke={palette.edge} strokeWidth={1.5} />
      {/* Inner star face */}
      <Polygon points={STAR_FACE} fill={`url(#face${uid})`} stroke={palette.rimLight} strokeWidth={1.2} />
      {/* Pinline on inner star */}
      <Polygon points={STAR_FACE} fill="none" stroke={palette.ink} strokeWidth={0.8} opacity={0.2} />
      {/* Tier pips near bottom star point */}
      {pips.map(x => <Circle key={x} cx={x} cy={105} r={2} fill={palette.ink} opacity={0.5} />)}
      {/* Specular highlight */}
      <Ellipse cx={44} cy={36} rx={18} ry={7} fill={Colors.white} opacity={0.22} transform="rotate(-30 44 36)" />
    </Svg>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function BadgeMedallion({
  metal, icon, size = 96, earned = false, fx = 'sheen', sheenDelayMs = 0,
}: Props) {
  const palette = BadgeMetals[earned ? metal : 'stone'];
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const pips = PIP_X[PIPS[metal]];
  const iconTranslateY = ICON_TRANSLATE[metal] * size;
  const sheenClipRadius = SHEEN_CLIP[metal](size);

  const SvgFace = { bronze: BronzeSvg, silver: SilverSvg, gold: GoldSvg, emerald: EmeraldSvg }[metal];

  return (
    <View
      style={{
        width: size,
        height: size,
        boxShadow: earned ? `0 ${size * 0.05}px ${size * 0.24}px 0 ${palette.glow}` : undefined,
      } as any}
    >
      <SvgFace uid={uid} palette={palette} size={size} pips={pips} />

      {/* Icon overlay, vertically offset to sit on the badge face */}
      <View style={[StyleSheet.absoluteFill, styles.iconWrap]}>
        <View style={{ opacity: earned ? 1 : 0.5, transform: [{ translateY: iconTranslateY }] }}>
          <Icon name={icon} size={size * 0.32} color={palette.ink} />
        </View>
      </View>

      {/* Lock roundel for unearned badges */}
      {!earned && size >= 40 && (
        <View style={[
          styles.lockRoundel,
          { width: size * 0.28, height: size * 0.28, borderRadius: size * 0.14, bottom: size * 0.03 },
        ]}>
          <Icon name="lock" size={size * 0.15} color={Colors.ink3} />
        </View>
      )}

      {/* Sheen FX */}
      {earned && fx !== 'none' && (
        <SheenSweep size={size} delayMs={sheenDelayMs} gradId={`sheen${uid}`} clipRadius={sheenClipRadius} />
      )}

      {/* Twinkle FX — full budget only */}
      {earned && fx === 'full' && TWINKLES.map((t, i) => (
        <Twinkle
          key={i}
          x={t.x * size} y={t.y * size} s={t.s * size}
          delay={t.delay} color={palette.sparkle}
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
