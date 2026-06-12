import React, { useEffect } from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import Animated, {
  cancelAnimation, interpolate, useAnimatedStyle, useSharedValue,
  withRepeat, withTiming,
} from 'react-native-reanimated';
import { Colors, FoodColors } from '../theme';
import { Ambient, Curves } from '../theme/motion';

// Hand-drawn spot illustrations for the three onboarding slides, in the app's
// editorial line style (1.8–2.5pt rounded strokes, accent greens on paper).
// Each floats gently so the slides feel alive without competing with the copy.

export type OnboardingArtVariant = 'capture' | 'cook' | 'plan';

interface Props {
  variant: OnboardingArtVariant;
  width?: number;
}

const INK = Colors.ink;
const INK_SOFT = Colors.ink3;
const GREEN = Colors.accent;
const GREEN_DEEP = Colors.accentDeep;
const GREEN_SOFT = Colors.accentSoft;
const CARD = Colors.surface;
const LINE = Colors.line2;

function Sparkle({ x, y, s, color = GREEN }: { x: number; y: number; s: number; color?: string }) {
  return (
    <Path
      d={`M${x},${y - s} C${x + s * 0.15},${y - s * 0.15} ${x + s * 0.15},${y - s * 0.15} ${x + s},${y} C${x + s * 0.15},${y + s * 0.15} ${x + s * 0.15},${y + s * 0.15} ${x},${y + s} C${x - s * 0.15},${y + s * 0.15} ${x - s * 0.15},${y + s * 0.15} ${x - s},${y} C${x - s * 0.15},${y - s * 0.15} ${x - s * 0.15},${y - s * 0.15} ${x},${y - s}`}
      fill={color}
    />
  );
}

function CaptureArt() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 260 220">
      {/* Soft backdrop */}
      <Circle cx={134} cy={112} r={92} fill={GREEN_SOFT} />
      <Circle cx={216} cy={48} r={22} fill={Colors.surface2} />

      {/* Photo print tucked behind, rotated left */}
      <G rotation={-9} origin="92, 118">
        <Rect x={42} y={62} width={100} height={116} rx={10} fill={CARD} stroke={LINE} strokeWidth={1.5} />
        <Rect x={52} y={72} width={80} height={64} rx={6} fill={FoodColors.toast.b} />
        <Path d="M52 124 l22 -18 16 12 18 -16 24 22 v12 a6 6 0 0 1 -6 6 h-68 a6 6 0 0 1 -6 -6 z" fill={FoodColors.toast.a} opacity={0.85} />
        <Circle cx={112} cy={86} r={7} fill={Colors.white} opacity={0.8} />
        <Line x1={56} y1={150} x2={116} y2={150} stroke={LINE} strokeWidth={4} strokeLinecap="round" />
        <Line x1={56} y1={161} x2={96} y2={161} stroke={LINE} strokeWidth={4} strokeLinecap="round" />
      </G>

      {/* Recipe card in front, rotated right */}
      <G rotation={7} origin="168, 122">
        <Rect x={118} y={56} width={104} height={132} rx={12} fill={CARD} stroke={LINE} strokeWidth={1.5} />
        <Line x1={130} y1={76} x2={196} y2={76} stroke={INK} strokeWidth={5} strokeLinecap="round" />
        <Line x1={130} y1={88} x2={176} y2={88} stroke={LINE} strokeWidth={4} strokeLinecap="round" />
        {[104, 118, 132].map(y => (
          <G key={y}>
            <Circle cx={134} cy={y} r={3.2} fill={GREEN} />
            <Line x1={144} y1={y} x2={202} y2={y} stroke={INK_SOFT} strokeWidth={3.4} strokeLinecap="round" opacity={0.55} />
          </G>
        ))}
        <Line x1={130} y1={150} x2={206} y2={150} stroke={LINE} strokeWidth={1.5} />
        <Line x1={130} y1={163} x2={198} y2={163} stroke={INK_SOFT} strokeWidth={3.4} strokeLinecap="round" opacity={0.4} />
        <Line x1={130} y1={174} x2={184} y2={174} stroke={INK_SOFT} strokeWidth={3.4} strokeLinecap="round" opacity={0.4} />
        {/* saved check */}
        <Circle cx={210} cy={184} r={13} fill={GREEN} />
        <Path d="M204.5 184.5 l4 4 7.5 -8.5" stroke={Colors.white} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </G>

      {/* Link chip floating top-left */}
      <G rotation={-6} origin="64, 44">
        <Rect x={26} y={28} width={76} height={30} rx={15} fill={GREEN_DEEP} />
        <Path d="M44 46 a6 6 0 0 1 0 -8.5 l5 -5 a6 6 0 0 1 8.5 8.5 l-2 2 M52 38 a6 6 0 0 1 0 8.5 l-5 5 a6 6 0 0 1 -8.5 -8.5 l2 -2"
          stroke={Colors.white} strokeWidth={2.2} strokeLinecap="round" fill="none" transform="translate(8, -1)" />
        <Line x1={66} y1={43} x2={90} y2={43} stroke={Colors.white} strokeWidth={3.5} strokeLinecap="round" opacity={0.9} />
      </G>

      <Sparkle x={228} y={92} s={9} />
      <Sparkle x={36} y={150} s={7} color={GREEN_DEEP} />
      <Sparkle x={206} y={26} s={5} color={FoodColors.toast.a} />
    </Svg>
  );
}

function CookArt() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 260 220">
      <Circle cx={128} cy={118} r={92} fill={GREEN_SOFT} />
      <Circle cx={38} cy={56} r={18} fill={Colors.surface2} />

      {/* Steam */}
      <Path d="M104 64 c-6 -10 6 -14 0 -24 M130 58 c-6 -10 6 -14 0 -24 M156 64 c-6 -10 6 -14 0 -24"
        stroke={INK_SOFT} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.6} />

      {/* Lid */}
      <Path d="M76 96 a54 22 0 0 1 108 0 z" fill={GREEN_DEEP} />
      <Rect x={120} y={70} width={20} height={9} rx={4.5} fill={INK} />

      {/* Pot body */}
      <Path d="M72 100 h116 v34 a44 26 0 0 1 -44 26 h-28 a44 26 0 0 1 -44 -26 z" fill={GREEN} />
      <Rect x={72} y={96} width={116} height={12} rx={6} fill={GREEN_DEEP} />
      {/* Handles */}
      <Path d="M72 110 h-16 a8 8 0 0 0 0 16 h12 M188 110 h16 a8 8 0 0 1 0 16 h-12"
        stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none" />
      {/* Highlight */}
      <Ellipse cx={100} cy={126} rx={14} ry={22} fill={Colors.white} opacity={0.16} />

      {/* Burner */}
      <Line x1={88} y1={176} x2={172} y2={176} stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <Line x1={104} y1={186} x2={156} y2={186} stroke={LINE} strokeWidth={4} strokeLinecap="round" />

      {/* Timer bubble */}
      <G rotation={5} origin="206, 64">
        <Rect x={176} y={42} width={72} height={42} rx={14} fill={CARD} stroke={LINE} strokeWidth={1.5} />
        <Circle cx={194} cy={63} r={9} stroke={GREEN_DEEP} strokeWidth={2.4} fill="none" />
        <Path d="M194 57.5 v5.5 l4 2.5" stroke={GREEN_DEEP} strokeWidth={2.2} strokeLinecap="round" fill="none" />
        <Line x1={210} y1={58} x2={236} y2={58} stroke={INK} strokeWidth={4.5} strokeLinecap="round" />
        <Line x1={210} y1={69} x2={228} y2={69} stroke={LINE} strokeWidth={4} strokeLinecap="round" />
      </G>

      <Sparkle x={56} y={120} s={7} />
      <Sparkle x={222} y={130} s={8} color={GREEN_DEEP} />
      <Sparkle x={70} y={36} s={5} color={FoodColors.soup.a} />
    </Svg>
  );
}

function PlanArt() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 260 220">
      <Circle cx={126} cy={110} r={92} fill={GREEN_SOFT} />
      <Circle cx={224} cy={156} r={20} fill={Colors.surface2} />

      {/* Week planner card */}
      <G rotation={-4} origin="118, 96">
        <Rect x={50} y={40} width={136} height={112} rx={14} fill={CARD} stroke={LINE} strokeWidth={1.5} />
        <Line x1={64} y1={60} x2={124} y2={60} stroke={INK} strokeWidth={5} strokeLinecap="round" />
        <Circle cx={168} cy={60} r={9} fill={GREEN_SOFT} />
        <Path d="M164 60 l3 3 6 -6.5" stroke={GREEN_DEEP} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* 7 day cells */}
        {[0, 1, 2, 3].map(i => (
          <Rect key={`a${i}`} x={64 + i * 30} y={76} width={24} height={26} rx={6}
            fill={i === 1 ? GREEN : Colors.surface2} stroke={i === 1 ? GREEN : LINE} strokeWidth={1.4} />
        ))}
        {[0, 1, 2].map(i => (
          <Rect key={`b${i}`} x={64 + i * 30} y={110} width={24} height={26} rx={6}
            fill={i === 2 ? GREEN : Colors.surface2} stroke={i === 2 ? GREEN : LINE} strokeWidth={1.4} />
        ))}
        <Path d="M90.5 87 l3.5 3.5 6 -7" stroke={Colors.white} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d="M126.5 121 l3.5 3.5 6 -7" stroke={Colors.white} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Line x1={70} y1={88} x2={82} y2={88} stroke={INK_SOFT} strokeWidth={2.8} strokeLinecap="round" opacity={0.45} />
        <Line x1={70} y1={122} x2={82} y2={122} stroke={INK_SOFT} strokeWidth={2.8} strokeLinecap="round" opacity={0.45} />
      </G>

      {/* Basket bottom-right with groceries */}
      <G rotation={4} origin="186, 164">
        {/* produce poking out */}
        <Path d="M168 124 c-2 -10 4 -18 14 -20" stroke={GREEN_DEEP} strokeWidth={4} strokeLinecap="round" fill="none" />
        <Ellipse cx={170} cy={130} rx={9} ry={13} fill={FoodColors.greens.a} transform="rotate(-18 170 130)" />
        <Rect x={196} y={112} width={10} height={26} rx={5} fill={FoodColors.tomato.b} transform="rotate(14 201 125)" />
        <Circle cx={186} cy={126} r={9} fill={FoodColors.soup.a} />
        {/* basket */}
        <Path d="M150 136 h72 l-7 36 a8 8 0 0 1 -8 6.5 h-42 a8 8 0 0 1 -8 -6.5 z" fill={GREEN} />
        <Path d="M150 136 h72" stroke={GREEN_DEEP} strokeWidth={7} strokeLinecap="round" />
        <Line x1={166} y1={146} x2={169} y2={170} stroke={Colors.white} strokeWidth={2.4} strokeLinecap="round" opacity={0.5} />
        <Line x1={186} y1={146} x2={186} y2={172} stroke={Colors.white} strokeWidth={2.4} strokeLinecap="round" opacity={0.5} />
        <Line x1={206} y1={146} x2={203} y2={170} stroke={Colors.white} strokeWidth={2.4} strokeLinecap="round" opacity={0.5} />
      </G>

      <Sparkle x={224} y={36} s={8} />
      <Sparkle x={38} y={168} s={7} color={GREEN_DEEP} />
      <Sparkle x={30} y={62} s={5} color={FoodColors.tomato.a} />
    </Svg>
  );
}

export default function OnboardingArt({ variant, width = 280 }: Props) {
  const f = useSharedValue(0);

  useEffect(() => {
    f.value = withRepeat(
      withTiming(1, { duration: Ambient.floatMs / 2, easing: Curves.drift }),
      -1,
      true,
    );
    return () => cancelAnimation(f);
  }, [f]);

  const float = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(f.value, [0, 1], [4, -4]) }],
  }));

  return (
    <Animated.View style={[{ width, height: width * (220 / 260) }, float]}>
      {variant === 'capture' && <CaptureArt />}
      {variant === 'cook' && <CookArt />}
      {variant === 'plan' && <PlanArt />}
    </Animated.View>
  );
}
