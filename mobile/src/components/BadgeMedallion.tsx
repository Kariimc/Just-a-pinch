import React, { useEffect, useId } from 'react';
import { View, Image, StyleSheet } from 'react-native';
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
//   bronze  → coin pendant with bail ring (charm) + engraved rope border
//   silver  → heraldic shield with laurel dots + star accents
//   gold    → trophy cup with crown, ornate handles, decorative base
//   emerald → 8-pointed sunburst star with gem dots at each point
//
// Earned badges: double sheen sweep + 12 glitter twinkles for dazzling FX.

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

// 8-pointed star polygon (outer r=50, inner r=22, center 60,60)
const STAR_OUTER = '60,10 68.4,39.7 95.4,24.6 80.3,51.6 110,60 80.3,68.4 95.4,95.4 68.4,80.3 60,110 51.6,80.3 24.6,95.4 39.7,68.4 10,60 39.7,51.6 24.6,24.6 51.6,39.7';
// Inner star (75% scale): outer r=37.5, inner r=16.5
const STAR_FACE = '60,22.5 66.3,44.8 86.6,33.5 75.2,53.7 97.5,60 75.2,66.3 86.6,86.6 66.3,75.2 60,97.5 53.7,75.2 33.5,86.6 44.8,66.3 22.5,60 44.8,53.7 33.5,33.5 53.7,44.8';

// Sheen clip border-radius per shape (approximates the silhouette)
const SHEEN_CLIP: Record<BadgeMetal, (s: number) => number> = {
  bronze: s => s * 0.5,
  silver: s => s * 0.08,
  gold: s => s * 0.10,
  emerald: s => s * 0.5,
};

// ─── 12 glitter twinkle positions ────────────────────────────────────────────

const TWINKLES = [
  { x: 0.14, y: 0.18, s: 0.15, delay: 0 },
  { x: 0.80, y: 0.10, s: 0.17, delay: 520 },
  { x: 0.90, y: 0.54, s: 0.12, delay: 1040 },
  { x: 0.22, y: 0.82, s: 0.15, delay: 1560 },
  { x: 0.05, y: 0.44, s: 0.10, delay: 2080 },
  { x: 0.62, y: 0.05, s: 0.13, delay: 300 },
  { x: 0.95, y: 0.30, s: 0.14, delay: 820 },
  { x: 0.70, y: 0.90, s: 0.11, delay: 1340 },
  { x: 0.36, y: 0.95, s: 0.13, delay: 1860 },
  { x: 0.06, y: 0.70, s: 0.10, delay: 2380 },
  { x: 0.50, y: 0.04, s: 0.17, delay: 180 },
  { x: 0.93, y: 0.74, s: 0.11, delay: 700 },
  { x: 0.30, y: 0.09, s: 0.10, delay: 1220 },
  { x: 0.86, y: 0.86, s: 0.13, delay: 1740 },
  { x: 0.10, y: 0.30, s: 0.11, delay: 2260 },
  { x: 0.46, y: 0.88, s: 0.10, delay: 980 },
  { x: 0.74, y: 0.38, s: 0.12, delay: 1480 },
  { x: 0.18, y: 0.58, s: 0.11, delay: 460 },
];

// ─── Particle FX ─────────────────────────────────────────────────────────────

function Glint({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="-10 -10 20 20">
      {/* faint long diagonal flares for a camera-sparkle feel */}
      <Path d="M0,-10 L0.6,-0.6 L10,0 L0.6,0.6 L0,10 L-0.6,0.6 L-10,0 L-0.6,-0.6 Z" fill={color} opacity={0.45} transform="rotate(45)" />
      {/* main four-point star */}
      <Path d="M0,-9 L1.5,-1.5 L9,0 L1.5,1.5 L0,9 L-1.5,1.5 L-9,0 L-1.5,-1.5 Z" fill={color} />
      {/* white-hot core */}
      <Circle cx={0} cy={0} r={1.9} fill={Colors.white} opacity={0.95} />
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
    transform: [
      { scale: 0.2 + t.value * 1.0 },
      { rotate: `${t.value * 180}deg` },
    ],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x, top: y }, anim]}>
      <Glint size={s} color={color} />
    </Animated.View>
  );
}

// Single sheen pass — call twice with different delayMs for double sweep
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
      { translateX: interpolate(p.value, [0, 1], [-size * 0.9, size * 0.9]) },
      { rotate: '22deg' },
    ],
  }));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: clipRadius, overflow: 'hidden' }]}>
      <Animated.View style={[
        { position: 'absolute', left: size * 0.24, top: -size * 0.28, width: size * 0.52, height: size * 1.56 },
        anim,
      ]}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={Colors.white} stopOpacity="0" />
              <Stop offset="0.38" stopColor={Colors.white} stopOpacity="0.28" />
              <Stop offset="0.5" stopColor={Colors.white} stopOpacity="0.78" />
              <Stop offset="0.62" stopColor={Colors.white} stopOpacity="0.28" />
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
          <Stop offset="0.25" stopColor={palette.rimMid} />
          <Stop offset="0.5" stopColor={palette.rimDeep} />
          <Stop offset="0.75" stopColor={palette.rimMid} />
          <Stop offset="1" stopColor={palette.rimLight} />
        </LinearGradient>
        <RadialGradient id={`face${uid}`} cx="36%" cy="30%" r="88%">
          <Stop offset="0" stopColor={palette.faceLight} />
          <Stop offset="0.45" stopColor={palette.faceMid} />
          <Stop offset="1" stopColor={palette.faceDeep} />
        </RadialGradient>
      </Defs>
      {/* Bail ring (charm loop at top) */}
      <Ellipse cx={60} cy={16} rx={12} ry={14} fill={`url(#rim${uid})`} stroke={palette.edge} strokeWidth={1.5} />
      <Ellipse cx={60} cy={16} rx={6.5} ry={8} fill={Colors.paper} />
      {/* Connector strip */}
      <Rect x={52} y={15} width={16} height={18} fill={`url(#rim${uid})`} />
      {/* Outer coin rim */}
      <Circle cx={60} cy={68} r={47} fill={`url(#rim${uid})`} stroke={palette.edge} strokeWidth={1.5} />
      {/* Rope/milled edge */}
      <Circle cx={60} cy={68} r={41} fill="none" stroke={palette.rimDeep} strokeWidth={5.5} strokeDasharray="2.4 3.6" opacity={0.55} />
      {/* Dished face */}
      <Circle cx={60} cy={68} r={34.5} fill={`url(#face${uid})`} stroke={palette.rimLight} strokeWidth={1.5} />
      {/* Engraved pinline */}
      <Circle cx={60} cy={68} r={28.5} fill="none" stroke={palette.ink} strokeWidth={1.2} opacity={0.28} />
      {/* Decorative inner dot ring */}
      {[0,60,120,180,240,300].map(deg => {
        const rad = (deg * Math.PI) / 180;
        return <Circle key={deg} cx={60 + 23 * Math.cos(rad)} cy={68 + 23 * Math.sin(rad)} r={1.4} fill={palette.ink} opacity={0.3} />;
      })}
      {/* Tier pips */}
      {pips.map(x => <Circle key={x} cx={x} cy={96} r={2.2} fill={palette.ink} opacity={0.55} />)}
      {/* Key specular highlight */}
      <Ellipse cx={44} cy={44} rx={22} ry={10} fill={Colors.white} opacity={0.26} transform="rotate(-28 44 44)" />
      {/* Bounce light */}
      <Ellipse cx={78} cy={92} rx={14} ry={7} fill={Colors.white} opacity={0.10} transform="rotate(-20 78 92)" />
    </Svg>
  );
}

function SilverSvg({ uid, palette, size, pips }: { uid: string; palette: any; size: number; pips: number[] }) {
  const rim  = 'M14,14 L106,14 L106,76 Q106,106 60,117 Q14,106 14,76 Z';
  const mid  = 'M19,19 L101,19 L101,74 Q101,100 60,110 Q19,100 19,74 Z';
  const face = 'M24,24 L96,24 L96,72 Q96,96 60,104 Q24,96 24,72 Z';
  // Laurel dots along the inner border (approximate positions on the shield path)
  const laurelDots = [
    [28,30],[36,26],[44,24],[52,24],[68,24],[76,24],[84,26],[92,30],
    [96,45],[96,60],[94,72],[87,84],[80,91],[72,97],[66,101],
    [54,101],[48,97],[40,91],[33,84],[26,72],[24,60],[24,45],
  ];
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id={`rim${uid}`} x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor={palette.rimLight} />
          <Stop offset="0.3" stopColor={palette.rimMid} />
          <Stop offset="0.55" stopColor={palette.rimDeep} />
          <Stop offset="0.8" stopColor={palette.rimMid} />
          <Stop offset="1" stopColor={palette.rimLight} />
        </LinearGradient>
        <RadialGradient id={`face${uid}`} cx="34%" cy="26%" r="88%">
          <Stop offset="0" stopColor={palette.faceLight} />
          <Stop offset="0.45" stopColor={palette.faceMid} />
          <Stop offset="1" stopColor={palette.faceDeep} />
        </RadialGradient>
      </Defs>
      {/* Outer shield rim */}
      <Path d={rim} fill={`url(#rim${uid})`} stroke={palette.edge} strokeWidth={1.5} />
      {/* Milled border */}
      <Path d={mid} fill="none" stroke={palette.rimDeep} strokeWidth={4} opacity={0.4} />
      {/* Shield face */}
      <Path d={face} fill={`url(#face${uid})`} stroke={palette.rimLight} strokeWidth={1.2} />
      {/* Heraldic cross dividers */}
      <Path d="M24,59 L96,59" stroke={palette.ink} strokeWidth={0.9} opacity={0.22} />
      <Path d="M60,24 L60,97" stroke={palette.ink} strokeWidth={0.9} opacity={0.22} />
      {/* Laurel dots along inner face border */}
      {laurelDots.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={1.6} fill={palette.ink} opacity={0.28} />
      ))}
      {/* Star accents at quadrant centres */}
      {[[42,42],[78,42],[42,78],[78,78]].map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={2.2} fill={palette.ink} opacity={0.25} />
      ))}
      {/* Tier pips near shield tip */}
      {pips.map(x => <Circle key={x} cx={x} cy={108} r={2.1} fill={palette.ink} opacity={0.55} />)}
      {/* Specular highlight */}
      <Ellipse cx={40} cy={36} rx={19} ry={9} fill={Colors.white} opacity={0.25} transform="rotate(-20 40 36)" />
      <Ellipse cx={82} cy={90} rx={12} ry={6} fill={Colors.white} opacity={0.10} transform="rotate(-15 82 90)" />
    </Svg>
  );
}

function GoldSvg({ uid, palette, size, pips }: { uid: string; palette: any; size: number; pips: number[] }) {
  const cupOuter = 'M22,22 L98,22 Q102,22 103,28 L93,68 Q92,74 86,74 L34,74 Q28,74 27,68 L17,28 Q18,22 22,22 Z';
  const cupFace  = 'M27,27 L93,27 L88,68 L32,68 Z';
  // Wing-style ornate handles
  const handleL  = 'M17,32 Q0,40 0,56 Q0,72 17,65 Q10,58 10,48 Q10,38 17,32 Z';
  const handleR  = 'M103,32 Q120,40 120,56 Q120,72 103,65 Q110,58 110,48 Q110,38 103,32 Z';
  // Crown teeth at top of cup
  const crown1L  = 'M30,22 L28,12 L36,18 L40,10 L44,18 L50,14 L50,22 Z';
  const crown1R  = 'M90,22 L92,12 L84,18 L80,10 L76,18 L70,14 L70,22 Z';
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id={`rim${uid}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={palette.rimLight} />
          <Stop offset="0.3" stopColor={palette.rimMid} />
          <Stop offset="0.55" stopColor={palette.rimDeep} />
          <Stop offset="0.8" stopColor={palette.rimMid} />
          <Stop offset="1" stopColor={palette.rimLight} />
        </LinearGradient>
        <RadialGradient id={`face${uid}`} cx="34%" cy="24%" r="92%">
          <Stop offset="0" stopColor={palette.faceLight} />
          <Stop offset="0.45" stopColor={palette.faceMid} />
          <Stop offset="1" stopColor={palette.faceDeep} />
        </RadialGradient>
        <LinearGradient id={`base${uid}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={palette.rimDeep} />
          <Stop offset="0.3" stopColor={palette.rimMid} />
          <Stop offset="0.5" stopColor={palette.rimLight} />
          <Stop offset="0.7" stopColor={palette.rimMid} />
          <Stop offset="1" stopColor={palette.rimDeep} />
        </LinearGradient>
      </Defs>
      {/* Ornate wing handles (rendered first — behind cup) */}
      <Path d={handleL} fill={`url(#rim${uid})`} stroke={palette.edge} strokeWidth={1} />
      <Path d={handleR} fill={`url(#rim${uid})`} stroke={palette.edge} strokeWidth={1} />
      {/* Handle inner shadow */}
      <Path d="M17,38 Q6,45 6,56 Q6,65 17,60" stroke={palette.rimDeep} strokeWidth={2} fill="none" opacity={0.4} />
      <Path d="M103,38 Q114,45 114,56 Q114,65 103,60" stroke={palette.rimDeep} strokeWidth={2} fill="none" opacity={0.4} />
      {/* Crown teeth */}
      <Path d={crown1L} fill={`url(#rim${uid})`} stroke={palette.edge} strokeWidth={1} />
      <Path d={crown1R} fill={`url(#rim${uid})`} stroke={palette.edge} strokeWidth={1} />
      {/* Cup body */}
      <Path d={cupOuter} fill={`url(#rim${uid})`} stroke={palette.edge} strokeWidth={1.5} />
      {/* Cup face */}
      <Path d={cupFace} fill={`url(#face${uid})`} />
      {/* Cup opening highlight */}
      <Path d="M30,30 L90,30" stroke={palette.rimLight} strokeWidth={2} opacity={0.55} />
      {/* Pinline inside cup */}
      <Path d="M34,35 L86,35 L82,64 L38,64 Z" fill="none" stroke={palette.ink} strokeWidth={0.9} opacity={0.2} />
      {/* Decorative stars on cup face */}
      {[[60,46],[46,54],[74,54]].map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={2} fill={palette.ink} opacity={0.22} />
      ))}
      {/* Stem */}
      <Rect x={52} y={74} width={16} height={17} fill={`url(#rim${uid})`} rx={2} />
      <Rect x={55} y={74} width={10} height={17} fill={`url(#face${uid})`} />
      {/* Base plate */}
      <Rect x={24} y={89} width={72} height={17} fill={`url(#rim${uid})`} rx={6} stroke={palette.edge} strokeWidth={1} />
      <Rect x={29} y={92} width={62} height={11} fill={`url(#base${uid})`} rx={4} />
      {/* Tier pips on base */}
      {pips.map(x => <Circle key={x} cx={x} cy={101} r={2.2} fill={palette.edge} opacity={0.75} />)}
      {/* Specular highlights */}
      <Ellipse cx={41} cy={34} rx={17} ry={8} fill={Colors.white} opacity={0.26} transform="rotate(-18 41 34)" />
      <Ellipse cx={82} cy={62} rx={10} ry={5} fill={Colors.white} opacity={0.12} transform="rotate(-10 82 62)" />
    </Svg>
  );
}

function EmeraldSvg({ uid, palette, size, pips }: { uid: string; palette: any; size: number; pips: number[] }) {
  // Gem dots at each of the 8 outer star points
  const gemPoints = [
    [60, 10], [95.4, 24.6], [110, 60], [95.4, 95.4],
    [60, 110], [24.6, 95.4], [10, 60], [24.6, 24.6],
  ];
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id={`rim${uid}`} x1="0.2" y1="0.1" x2="0.8" y2="0.9">
          <Stop offset="0" stopColor={palette.rimLight} />
          <Stop offset="0.3" stopColor={palette.rimMid} />
          <Stop offset="0.55" stopColor={palette.rimDeep} />
          <Stop offset="0.8" stopColor={palette.rimMid} />
          <Stop offset="1" stopColor={palette.rimLight} />
        </LinearGradient>
        <RadialGradient id={`face${uid}`} cx="34%" cy="26%" r="88%">
          <Stop offset="0" stopColor={palette.faceLight} />
          <Stop offset="0.45" stopColor={palette.faceMid} />
          <Stop offset="1" stopColor={palette.faceDeep} />
        </RadialGradient>
        <RadialGradient id={`glow${uid}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={palette.faceLight} stopOpacity="0.4" />
          <Stop offset="1" stopColor={palette.faceLight} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {/* Outer glow halo behind the star */}
      <Circle cx={60} cy={60} r={57} fill={`url(#glow${uid})`} />
      {/* Outer star rim */}
      <Polygon points={STAR_OUTER} fill={`url(#rim${uid})`} stroke={palette.edge} strokeWidth={1.5} />
      {/* Inner star face */}
      <Polygon points={STAR_FACE} fill={`url(#face${uid})`} stroke={palette.rimLight} strokeWidth={1.2} />
      {/* Pinline trace on inner star */}
      <Polygon points={STAR_FACE} fill="none" stroke={palette.ink} strokeWidth={0.9} opacity={0.22} />
      {/* Gem dot accent at each outer star point */}
      {gemPoints.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={3.2} fill={palette.rimLight} stroke={palette.edge} strokeWidth={0.8} opacity={0.85} />
      ))}
      {/* Inner decorative dots (between star points) */}
      {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        return <Circle key={i} cx={60 + 30 * Math.cos(rad)} cy={60 + 30 * Math.sin(rad)} r={1.6} fill={palette.ink} opacity={0.3} />;
      })}
      {/* Tier pips near bottom star point */}
      {pips.map(x => <Circle key={x} cx={x} cy={106} r={2.2} fill={palette.ink} opacity={0.55} />)}
      {/* Specular highlights */}
      <Ellipse cx={42} cy={34} rx={19} ry={8} fill={Colors.white} opacity={0.26} transform="rotate(-30 42 34)" />
      <Ellipse cx={80} cy={88} rx={12} ry={6} fill={Colors.white} opacity={0.12} transform="rotate(-20 80 88)" />
    </Svg>
  );
}

// ─── Realistic badge art (earned state) ──────────────────────────────────────
// Photoreal renders sit behind the icon for earned badges; locked badges keep
// the engraved stone SVG below. require() is static so the bundler includes them.
const BADGE_ART: Record<BadgeMetal, number> = {
  bronze: require('../../assets/badges/badge-bronze.png'),
  silver: require('../../assets/badges/badge-silver.png'),
  gold: require('../../assets/badges/badge-gold.png'),
  emerald: require('../../assets/badges/badge-emerald.png'),
};

// The silver shield render has a cut-through centre; fill it with an opaque
// metal boss so the screen doesn't show through the hole. Fractions of the box.
const SILVER_BOSS = { cx: 0.52, cy: 0.52, d: 0.40 };

// ─── Main export ──────────────────────────────────────────────────────────────

export default function BadgeMedallion({
  metal, size = 96, earned = false, fx = 'sheen', sheenDelayMs = 0,
}: Props) {
  const palette = BadgeMetals[earned ? metal : 'stone'];
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const pips = PIP_X[PIPS[metal]];

  const art = earned ? BADGE_ART[metal] : null;

  // ── Earned: the photoreal render IS the badge (no overlaid icon) + sparkle ──
  if (art) {
    const bossSize = metal === 'silver' ? size * SILVER_BOSS.d : 0;
    return (
      <View
        style={{
          width: size,
          height: size,
          boxShadow: `0 ${size * 0.06}px ${size * 0.30}px 0 ${palette.glow}`,
        } as any}
      >
        <Image source={art} style={{ width: size, height: size }} resizeMode="contain" />

        {/* Opaque metal boss to fill the silver shield's cut-through centre */}
        {!!bossSize && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: SILVER_BOSS.cx * size - bossSize / 2,
              top: SILVER_BOSS.cy * size - bossSize / 2,
              width: bossSize, height: bossSize, borderRadius: bossSize / 2,
              backgroundColor: palette.faceMid,
              borderWidth: Math.max(1, size * 0.012), borderColor: palette.rimLight,
              overflow: 'hidden',
            }}
          >
            <View style={{ flex: 1, backgroundColor: palette.faceLight, opacity: 0.45 }} />
          </View>
        )}

        {/* Sparkle field — full FX budget only (hero + detail surfaces) */}
        {fx === 'full' && TWINKLES.map((t, i) => (
          <Twinkle
            key={i}
            x={t.x * size} y={t.y * size} s={t.s * size}
            delay={t.delay} color={palette.sparkle}
          />
        ))}
      </View>
    );
  }

  // ── Locked (or art missing): engraved stone/metal SVG fallback ─────────────
  const sheenClipRadius = SHEEN_CLIP[metal](size);

  const SvgFace = { bronze: BronzeSvg, silver: SilverSvg, gold: GoldSvg, emerald: EmeraldSvg }[metal];

  return (
    <View
      style={{
        width: size,
        height: size,
        boxShadow: earned ? `0 ${size * 0.06}px ${size * 0.30}px 0 ${palette.glow}` : undefined,
      } as any}
    >
      <SvgFace uid={uid} palette={palette} size={size} pips={pips} />

      {/* Lock roundel for unearned badges */}
      {!earned && size >= 40 && (
        <View style={[
          styles.lockRoundel,
          { width: size * 0.28, height: size * 0.28, borderRadius: size * 0.14, bottom: size * 0.04 },
        ]}>
          <Icon name="lock" size={size * 0.15} color={Colors.ink3} />
        </View>
      )}

      {/* Double sheen sweep (earned badges) — two sequential passes */}
      {earned && fx !== 'none' && (
        <>
          <SheenSweep size={size} delayMs={sheenDelayMs} gradId={`sheenA${uid}`} clipRadius={sheenClipRadius} />
          <SheenSweep size={size} delayMs={sheenDelayMs + 900} gradId={`sheenB${uid}`} clipRadius={sheenClipRadius} />
        </>
      )}

      {/* 12 glitter twinkles — full FX budget only */}
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
