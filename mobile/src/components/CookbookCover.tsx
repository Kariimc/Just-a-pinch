import React, { useState } from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import Svg, {
  Defs, RadialGradient, Stop, Rect, Path, Circle, G,
} from 'react-native-svg';

// Family-cookbook cover, engraving style: muted olive cloth, cream botanical
// line art (garlic bulb, laurel sprigs, star anise, spice jar), and a bottom
// still-life of spice bowls (terracotta accents), peppercorns, cinnamon
// sticks, and a mortar & pestle inside a double-rule frame. The centre field
// is intentionally clear — HomeScreen overlays "{Lastname}'s Family Cookbook"
// there in the serif display font.
//
// The component measures its rendered size and draws with a matching viewBox
// so nothing is scaled or cropped on wide screens: the frame and side
// botanicals anchor to the edges, the garlic and still-life to the centre.
// (A fixed-size drawing with preserveAspectRatio="slice" zoomed badly on
// tablets/foldables — don't reintroduce it.)
interface Props {
  style?: ViewStyle;
}

const CREAM = '#E9E4D0';      // engraving line work
const TERRA = '#C07640';      // terracotta spice accent
const TERRA_LIGHT = '#CB854E';
const PEPPER = '#2E2A20';     // peppercorns

// Reference design box — deltas reposition groups when the card differs.
const RW = 390;
const RH = 190;

export default function CookbookCover({ style }: Props) {
  const [size, setSize] = useState({ w: RW, h: RH });
  const W = size.w || RW;
  const H = size.h || RH;
  const dxC = (W - RW) / 2;  // centre-anchored groups
  const dxR = W - RW;        // right-edge-anchored groups
  const dyB = H - RH;        // bottom-anchored groups
  const dyM = dyB / 2;       // vertically-centred groups

  return (
    <View
      style={[styles.fill, style]}
      onLayout={e => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <RadialGradient id="cbBg" cx="50%" cy="42%" r="95%">
            <Stop offset="0" stopColor="#6B7551" />
            <Stop offset="0.6" stopColor="#5C6847" />
            <Stop offset="1" stopColor="#47523A" />
          </RadialGradient>
        </Defs>

        {/* Olive cloth board */}
        <Rect width={W} height={H} fill="url(#cbBg)" />

        {/* Double-rule frame */}
        <Rect x="14" y="12" width={W - 28} height={H - 24} rx="3" fill="none" stroke={CREAM} strokeOpacity="0.55" strokeWidth="1.6" />
        <Rect x="19" y="17" width={W - 38} height={H - 34} rx="2" fill="none" stroke={CREAM} strokeOpacity="0.28" strokeWidth="0.8" />

        {/* Garlic bulb, top centre — drawn at 75% and kept tight under the
            frame so it never sits behind the title overlay */}
        <G x={dxC + 48.75} y={6} scale={0.75} stroke={CREAM} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M195 26 q1 4 3 6" />
          <Path d="M195 26 q-7 8 -11 13 q-5 7 -1 13 q4 6 12 6 q8 0 12 -6 q4 -6 -1 -13 q-4 -5 -11 -13 Z" fill={CREAM} fillOpacity="0.08" />
          <Path d="M195 30 L195 58 M188 38 q-3 10 1 19 M202 38 q3 10 -1 19" />
        </G>

        {/* Left laurel sprig */}
        <G y={dyM} stroke={CREAM} strokeWidth="1.4" fill={CREAM} fillOpacity="0.10" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M44 150 Q38 110 52 64" fill="none" />
          <Path d="M48 132 q-12 -4 -15 -14 q12 -2 15 14 Z" />
          <Path d="M45 112 q12 -7 11 -18 q-13 2 -11 18 Z" />
          <Path d="M44 92 q-12 -4 -14 -15 q12 -1 14 15 Z" />
          <Path d="M46 74 q11 -7 10 -17 q-12 2 -10 17 Z" />
        </G>
        {/* Right laurel sprig */}
        <G x={dxR} y={dyM} stroke={CREAM} strokeWidth="1.4" fill={CREAM} fillOpacity="0.10" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M346 150 Q352 110 338 64" fill="none" />
          <Path d="M342 132 q12 -4 15 -14 q-12 -2 -15 14 Z" />
          <Path d="M345 112 q-12 -7 -11 -18 q13 2 11 18 Z" />
          <Path d="M346 92 q12 -4 14 -15 q-12 -1 -14 15 Z" />
          <Path d="M344 74 q-11 -7 -10 -17 q12 2 10 17 Z" />
        </G>

        {/* Star anise, top-left */}
        <G x="78" y="42" stroke={CREAM} strokeWidth="1.3" fill="none" strokeLinecap="round">
          <Path d="M0 -9 L0 9 M-8 -4.5 L8 4.5 M-8 4.5 L8 -4.5" />
          <Circle r="2.6" fill={CREAM} fillOpacity="0.25" />
        </G>
        {/* Spice jar, top-right */}
        <G x={306 + dxR} y="30" stroke={CREAM} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <Rect x="-7" y="6" width="14" height="22" rx="4" fill={CREAM} fillOpacity="0.08" />
          <Rect x="-5" y="0" width="10" height="6" rx="1.5" fill={CREAM} fillOpacity="0.16" />
          <Path d="M-4 16 L4 16 M-4 20 L4 20" strokeOpacity="0.6" />
        </G>

        {/* Bottom still-life, centred */}
        <G x={dxC} y={dyB}>
          {/* Bowl of ground spice (terracotta mound) */}
          <G stroke={CREAM} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M96 151 q14 -11 28 0 L96 151 Z" fill={TERRA} stroke={TERRA} strokeWidth="1" />
            <Path d="M92 152 L132 152 Q130 165 112 165 Q94 165 92 152 Z" fill={CREAM} fillOpacity="0.10" />
          </G>
          {/* Bowl of chickpeas */}
          <G stroke={CREAM} strokeWidth="1.4" strokeLinecap="round">
            <Circle cx="161" cy="152" r="3.4" fill={TERRA} stroke="none" />
            <Circle cx="168" cy="149.5" r="3.4" fill={TERRA_LIGHT} stroke="none" />
            <Circle cx="175" cy="152" r="3.4" fill={TERRA} stroke="none" />
            <Path d="M152 156 L184 156 Q182 167 168 167 Q154 167 152 156 Z" fill={CREAM} fillOpacity="0.10" />
          </G>
          {/* Bowl of peppercorns */}
          <G stroke={CREAM} strokeWidth="1.4">
            <G fill={PEPPER} stroke="none">
              <Circle cx="212" cy="149" r="2" /><Circle cx="218" cy="147" r="2" /><Circle cx="224" cy="149" r="2" />
              <Circle cx="230" cy="147" r="2" /><Circle cx="215" cy="144" r="2" /><Circle cx="227" cy="144" r="2" />
              <Circle cx="221" cy="141" r="2" />
            </G>
            <Path d="M204 152 L240 152 Q238 165 222 165 Q206 165 204 152 Z" fill={CREAM} fillOpacity="0.10" />
          </G>
          {/* Cinnamon sticks */}
          <G stroke={CREAM} strokeWidth="1.4" fill={CREAM} fillOpacity="0.08" strokeLinecap="round">
            <Path d="M252 164 L282 146 q3 -2 5 1 q1 3 -2 5 L255 170 q-3 2 -5 -1 q-1 -3 2 -5 Z" />
            <Path d="M260 170 L290 152 q3 -2 5 1 q1 3 -2 5 L263 176 q-3 2 -5 -1 q-1 -3 2 -5 Z" />
          </G>
          {/* Mortar & pestle */}
          <G stroke={CREAM} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M327 137 L341 122 q3 -3 6 0 q3 3 0 6 L333 142" fill={CREAM} fillOpacity="0.14" />
            <Path d="M306 145 L346 145 Q344 164 326 164 Q308 164 306 145 Z" fill={CREAM} fillOpacity="0.12" />
          </G>
          {/* Basil leaves, bottom-left */}
          <G stroke={CREAM} strokeWidth="1.3" fill={CREAM} fillOpacity="0.10" strokeLinejoin="round">
            <Path d="M62 162 q-10 -10 -4 -18 q9 4 4 18 Z" />
            <Path d="M68 164 q2 -13 12 -15 q1 10 -12 15 Z" />
          </G>
          {/* Scattered seeds */}
          <G fill={CREAM} opacity="0.5">
            <Circle cx="142" cy="163" r="1.3" /><Circle cx="196" cy="160" r="1.3" /><Circle cx="247" cy="158" r="1.3" />
            <Circle cx="299" cy="161" r="1.3" /><Circle cx="86" cy="166" r="1.3" />
          </G>
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { overflow: 'hidden' },
});
