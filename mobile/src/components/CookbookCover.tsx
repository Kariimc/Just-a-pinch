import React, { useState } from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import Svg, {
  Defs, RadialGradient, Stop, Rect, Path, Circle, Ellipse, G,
} from 'react-native-svg';

// Family-cookbook cover in a hand-engraved style: deep brand-green cloth,
// cream botanical line art (garlic with clove ridges and root whiskers,
// veined laurel sprigs, star anise, a glass spice jar) and a bottom
// still-life — spice bowls in 3/4 view with terracotta accents, peppercorns
// with a couple spilled, cinnamon quills with rolled ends, a mortar &
// pestle — inside a double-rule frame. Shapes are deliberately asymmetric,
// with varied stroke weights and hatch shading, so nothing reads as
// geometric clip-art. The centre field stays clear: HomeScreen overlays
// "{Lastname}'s Family Cookbook" there in the serif display font.
//
// The component measures its rendered size and draws with a matching viewBox
// so nothing is scaled or cropped on wide screens: the frame and side
// botanicals anchor to the edges, the garlic and still-life to the centre.
// (A fixed-size drawing with preserveAspectRatio="slice" zoomed badly on
// tablets/foldables — don't reintroduce it.)
interface Props {
  style?: ViewStyle;
}

const CREAM = '#EDE6D2';        // engraving line work
const TERRA = '#C07640';        // terracotta spice accent
const TERRA_DEEP = '#A75F2F';
const TERRA_LIGHT = '#CB854E';
const HILITE = '#F2D8B8';       // highlight glints on the chickpeas
const PEPPER = '#2E2A20';       // peppercorns

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
            <Stop offset="0" stopColor="#2E8B50" />
            <Stop offset="0.58" stopColor="#1E7A41" />
            <Stop offset="1" stopColor="#123E22" />
          </RadialGradient>
        </Defs>

        {/* Cloth board */}
        <Rect width={W} height={H} fill="url(#cbBg)" />

        {/* Double-rule frame */}
        <Rect x="14" y="12" width={W - 28} height={H - 24} rx="3" fill="none" stroke={CREAM} strokeOpacity="0.55" strokeWidth="1.6" />
        <Rect x="19" y="17" width={W - 38} height={H - 34} rx="2" fill="none" stroke={CREAM} strokeOpacity="0.26" strokeWidth="0.8" />

        {/* Garlic, top centre — drawn at 72% and kept tight under the frame
            so it never sits behind the title overlay */}
        <G x={dxC + 54.6} y={4} scale={0.72} stroke={CREAM} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <Path strokeWidth="1.5" d="M191.5 30.5 q-1.5 -5 1 -7.5 q1.5 -1.5 3 -1.5 q3.5 0 4.5 4 q0.5 3 -0.8 5" />
          <Path strokeWidth="1.2" d="M196 22.5 q3.5 -2.5 6.5 1" strokeOpacity="0.8" />
          <Path
            strokeWidth="1.5" fill={CREAM} fillOpacity="0.07"
            d="M195 30.5 c-6.5 5.5 -12.5 9.5 -13.5 16.5 c-1 8 6.5 13 13.5 13 c7 0 14.5 -5 13.5 -13 c-1 -7 -7 -11 -13.5 -16.5 z"
          />
          <Path strokeWidth="1.2" d="M195 34 c-1.2 8 -0.4 16 0.8 23.5" strokeOpacity="0.9" />
          <Path strokeWidth="1.2" d="M189.5 38 c-4 6.5 -3.5 13.5 -0.5 19.5" strokeOpacity="0.75" />
          <Path strokeWidth="1.2" d="M200.5 38 c4 6.5 3.5 13.5 0.5 19.5" strokeOpacity="0.75" />
          <Path strokeWidth="1" d="M185 44 q-1.5 6 1 11" strokeOpacity="0.45" />
          <Path strokeWidth="1" d="M205 44 q1.5 6 -1 11" strokeOpacity="0.45" />
          <Path strokeWidth="1" d="M191 60.5 l-1.5 2.8 M195.2 61 l-0.2 3 M199.3 60.5 l1.4 2.8" strokeOpacity="0.7" />
        </G>

        {/* Left laurel: curved stem, veined leaves, two berries */}
        <G y={dyM} stroke={CREAM} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <Path strokeWidth="1.4" d="M45 153 C37 125 39 97 55 66" />
          <Path strokeWidth="1.2" fill={CREAM} fillOpacity="0.09" d="M47.5 135 q-13.5 -1.5 -18 -13 q13.5 -3.5 18 13 z" />
          <Path strokeWidth="0.9" d="M46 133.5 q-8 -5.5 -13 -10.5" strokeOpacity="0.6" />
          <Path strokeWidth="1.2" fill={CREAM} fillOpacity="0.09" d="M44.5 114 q12 -8 11.5 -19.5 q-13 3 -11.5 19.5 z" />
          <Path strokeWidth="0.9" d="M45.5 112 q5 -8 9 -15" strokeOpacity="0.6" />
          <Path strokeWidth="1.2" fill={CREAM} fillOpacity="0.09" d="M43.5 94 q-13 -3 -15.5 -14.5 q13 -1.5 15.5 14.5 z" />
          <Path strokeWidth="0.9" d="M42.5 92 q-7.5 -5 -11.5 -9.5" strokeOpacity="0.6" />
          <Path strokeWidth="1.2" fill={CREAM} fillOpacity="0.09" d="M47 76 q10.5 -7.5 9.5 -17.5 q-11.5 3 -9.5 17.5 z" />
          <Path strokeWidth="0.9" d="M48 74 q4.5 -7 7.5 -12.5" strokeOpacity="0.6" />
          <Circle cx="49.5" cy="146" r="1.9" fill={CREAM} fillOpacity="0.55" stroke="none" />
          <Circle cx="44.5" cy="141.5" r="1.6" fill={CREAM} fillOpacity="0.45" stroke="none" />
        </G>
        {/* Right laurel (hand-varied mirror) */}
        <G x={dxR} y={dyM} stroke={CREAM} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <Path strokeWidth="1.4" d="M345 153 C353 125 351 97 335 66" />
          <Path strokeWidth="1.2" fill={CREAM} fillOpacity="0.09" d="M342.5 135 q13.5 -1.5 18 -13 q-13.5 -3.5 -18 13 z" />
          <Path strokeWidth="0.9" d="M344 133.5 q8 -5.5 13 -10.5" strokeOpacity="0.6" />
          <Path strokeWidth="1.2" fill={CREAM} fillOpacity="0.09" d="M345.5 114 q-12 -8 -11.5 -19.5 q13 3 11.5 19.5 z" />
          <Path strokeWidth="0.9" d="M344.5 112 q-5 -8 -9 -15" strokeOpacity="0.6" />
          <Path strokeWidth="1.2" fill={CREAM} fillOpacity="0.09" d="M346.5 94 q13 -3 15.5 -14.5 q-13 -1.5 -15.5 14.5 z" />
          <Path strokeWidth="0.9" d="M347.5 92 q7.5 -5 11.5 -9.5" strokeOpacity="0.6" />
          <Path strokeWidth="1.2" fill={CREAM} fillOpacity="0.09" d="M343 76 q-10.5 -7.5 -9.5 -17.5 q11.5 3 9.5 17.5 z" />
          <Path strokeWidth="0.9" d="M342 74 q-4.5 -7 -7.5 -12.5" strokeOpacity="0.6" />
          <Circle cx="340.5" cy="146" r="1.9" fill={CREAM} fillOpacity="0.55" stroke="none" />
          <Circle cx="345.5" cy="141.5" r="1.6" fill={CREAM} fillOpacity="0.45" stroke="none" />
        </G>

        {/* Star anise: six teardrop pods around a core */}
        <G x={78} y={42} stroke={CREAM} fill={CREAM} fillOpacity="0.10" strokeWidth="1.1" strokeLinejoin="round">
          <Path d="M0 -2.5 q2.5 -5.5 0.5 -10.5 q-4 4 -0.5 10.5 z" transform="rotate(8)" />
          <Path d="M0 -2.5 q2.5 -5.5 0.5 -10.5 q-4 4 -0.5 10.5 z" transform="rotate(68)" />
          <Path d="M0 -2.5 q2.5 -5.5 0.5 -10.5 q-4 4 -0.5 10.5 z" transform="rotate(128)" />
          <Path d="M0 -2.5 q2.5 -5.5 0.5 -10.5 q-4 4 -0.5 10.5 z" transform="rotate(188)" />
          <Path d="M0 -2.5 q2.5 -5.5 0.5 -10.5 q-4 4 -0.5 10.5 z" transform="rotate(248)" />
          <Path d="M0 -2.5 q2.5 -5.5 0.5 -10.5 q-4 4 -0.5 10.5 z" transform="rotate(305)" />
          <Circle r="2.4" fillOpacity="0.3" />
        </G>

        {/* Spice jar: glass, cork, contents line and grains */}
        <G x={306 + dxR} y={28} stroke={CREAM} fill="none" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <Path fill={CREAM} fillOpacity="0.07" d="M-5 6 q-3.5 1.5 -3.5 5.5 L-8.5 24 q0 4.5 8.5 4.5 q8.5 0 8.5 -4.5 L8.5 11.5 q0 -4 -3.5 -5.5 z" />
          <Rect x="-5" y="-0.5" width="10" height="6" rx="1.8" fill={CREAM} fillOpacity="0.18" />
          <Path d="M-7.5 17 q7.5 3.5 15 0" strokeOpacity="0.55" />
          <Circle cx="-2.5" cy="21.5" r="1" fill={CREAM} stroke="none" fillOpacity="0.5" />
          <Circle cx="2" cy="23" r="1" fill={CREAM} stroke="none" fillOpacity="0.5" />
          <Circle cx="-0.5" cy="25" r="1" fill={CREAM} stroke="none" fillOpacity="0.5" />
        </G>

        {/* Bottom still-life, centred */}
        <G x={dxC} y={dyB}>
          {/* Bowl of ground spice: 3/4 view, terracotta mound, foot ring, hatching */}
          <G stroke={CREAM} fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <Path
              fill={TERRA} stroke={TERRA_DEEP} strokeWidth="1"
              d="M96 147.5 q4 -6 9.5 -4.5 q3.5 -5 8.5 -2.5 q5 -3.5 8 0.5 q4.5 0.5 5.5 4 q0.8 2 0.3 3.5 l-32 0 q-0.5 -0.6 0.2 -1 z"
            />
            <Path strokeWidth="0.8" stroke="#8F4F26" d="M104 144.5 l1.5 1.2 M112 141.5 l1.4 1.3 M119 144 l1.4 1.1 M109 147 l1.3 1" strokeOpacity="0.8" />
            <Ellipse cx="112" cy="149.8" rx="21" ry="5" fill={CREAM} fillOpacity="0.10" />
            <Path d="M91 150.5 q2.5 11.5 21 12.8 q18.5 -1.3 21 -12.8" />
            <Path strokeWidth="1.1" d="M104.5 163.5 q7.5 3 15 0 l-1 2.8 q-6.5 2 -13 0 z" fill={CREAM} fillOpacity="0.08" />
            <Path strokeWidth="0.9" d="M97 156 q5 4.5 11 5.5 M99.5 159.5 q3.5 2.2 7 2.8" strokeOpacity="0.35" />
          </G>
          {/* Small bowl of chickpeas with glints */}
          <G stroke={CREAM} fill="none" strokeWidth="1.3" strokeLinecap="round">
            <Circle cx="161" cy="150.5" r="3.4" fill={TERRA} stroke={TERRA_DEEP} strokeWidth="0.9" />
            <Circle cx="168.5" cy="148" r="3.5" fill={TERRA_LIGHT} stroke={TERRA_DEEP} strokeWidth="0.9" />
            <Circle cx="176" cy="150.5" r="3.3" fill={TERRA} stroke={TERRA_DEEP} strokeWidth="0.9" />
            <Path strokeWidth="0.8" stroke={HILITE} d="M159.8 149 a2 2 0 0 1 1.4 -1.4 M167.3 146.6 a2 2 0 0 1 1.4 -1.4 M174.9 149.1 a2 2 0 0 1 1.3 -1.3" />
            <Ellipse cx="168.5" cy="153.5" rx="15.5" ry="4" fill={CREAM} fillOpacity="0.10" />
            <Path d="M153 154.5 q2 9 15.5 10 q13.5 -1 15.5 -10" />
            <Path strokeWidth="0.9" d="M158 159.5 q4.5 3.5 9.5 4.2" strokeOpacity="0.35" />
          </G>
          {/* Bowl of peppercorns, a couple spilled on the table */}
          <G stroke={CREAM} fill="none" strokeWidth="1.3" strokeLinecap="round">
            <G fill={PEPPER} stroke="none">
              <Circle cx="214" cy="147.5" r="2" /><Circle cx="219.5" cy="145.2" r="1.9" /><Circle cx="225" cy="147.3" r="2" />
              <Circle cx="230.5" cy="145.5" r="1.8" /><Circle cx="217" cy="142.6" r="1.8" /><Circle cx="228" cy="142.3" r="1.7" />
              <Circle cx="222.5" cy="139.8" r="1.8" /><Circle cx="234" cy="148" r="1.7" />
            </G>
            <Ellipse cx="223" cy="149.5" rx="17.5" ry="4.5" fill={CREAM} fillOpacity="0.10" />
            <Path d="M205.5 150.5 q2.5 10.5 17.5 11.5 q15 -1 17.5 -11.5" />
            <Path strokeWidth="0.9" d="M211 156.5 q5 4 11 4.8" strokeOpacity="0.35" />
            <Circle cx="245.5" cy="161.5" r="1.8" fill={PEPPER} stroke="none" />
            <Circle cx="200" cy="163.5" r="1.6" fill={PEPPER} stroke="none" />
          </G>
          {/* Cinnamon: two quills with rolled ends and bark texture */}
          <G stroke={CREAM} strokeLinecap="round" strokeLinejoin="round">
            <Path
              fill={CREAM} fillOpacity="0.09" strokeWidth="1.3"
              d="M251.5 164.5 Q268 154 285.5 148.5 L287.8 154.8 Q271 160.5 256.5 170 Z"
            />
            <Path strokeWidth="0.85" fill="none" strokeOpacity="0.5" d="M257.5 162.5 q12 -7 24 -10.5 M255 166.5 q5 -3.2 10.5 -6" />
            <Path strokeWidth="1.15" fill="none" strokeOpacity="0.9" d="M285.8 150.8 q4 -1.6 5.2 1.6 q1 2.8 -2.4 3.8" />
            <Path strokeWidth="0.8" fill="none" strokeOpacity="0.6" d="M286.8 152.4 q2 -0.7 2.6 1.1" />
            <Path
              fill={CREAM} fillOpacity="0.09" strokeWidth="1.3"
              d="M260.5 172.5 Q276.5 162.5 293.5 157.5 L295.6 163.5 Q279.5 168.5 265 177.5 Z"
            />
            <Path strokeWidth="0.85" fill="none" strokeOpacity="0.5" d="M267 170.5 q11 -6.3 22 -9.5" />
            <Path strokeWidth="1.15" fill="none" strokeOpacity="0.9" d="M293.8 159.6 q3.8 -1.5 4.9 1.5 q0.9 2.6 -2.2 3.6" />
            <Path strokeWidth="0.8" fill="none" strokeOpacity="0.6" d="M294.7 161.1 q1.9 -0.6 2.4 1" />
          </G>
          {/* Mortar & pestle: continuous vessel, rim band, foot, diagonal pestle */}
          <G stroke={CREAM} fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <Path fill={CREAM} fillOpacity="0.12" d="M329.5 139.5 q-2.5 -1.5 -1 -4 L338 121.5 q2 -3 5 -1.2 q3 1.8 1.2 4.8 L335 139 q-1.8 2.5 -5.5 0.5 z" />
            <Ellipse cx="343" cy="121.5" rx="3.6" ry="3" fill={CREAM} fillOpacity="0.18" transform="rotate(32 343 121.5)" />
            <Path
              fill={CREAM} fillOpacity="0.10" strokeWidth="1.5"
              d="M306.5 141.5 q19.5 -6.5 39 0 q-0.6 12.5 -8.2 17 q-3.6 2.2 -11.3 2.2 q-7.7 0 -11.3 -2.2 q-7.6 -4.5 -8.2 -17 z"
            />
            <Path strokeWidth="1.1" d="M309.5 143.2 q16.5 4.8 33 0" strokeOpacity="0.85" />
            <Path strokeWidth="0.9" d="M308.5 147.5 q17.5 5.2 35 0" strokeOpacity="0.4" />
            <Path strokeWidth="1.1" d="M317.5 161.8 q8.5 3 17 0 l-1.3 3.4 q-7.2 2.2 -14.4 0 z" fill={CREAM} fillOpacity="0.08" />
            <Path strokeWidth="0.9" d="M312.5 150.5 q4 6.5 11 8.2 M315.5 155.5 q3 3.2 7 4.2" strokeOpacity="0.35" />
          </G>
          {/* Basil: two veined leaves */}
          <G stroke={CREAM} fill={CREAM} fillOpacity="0.09" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round">
            <Path d="M62.5 164.5 q-12.5 -7.5 -8.5 -19.5 q11.5 5 8.5 19.5 z" />
            <Path strokeWidth="0.85" d="M61.5 162 q-5 -8 -6.5 -14 M60 158.5 l-3.8 -1.2 M58.5 153.5 l-3.4 -0.8" strokeOpacity="0.6" fill="none" />
            <Path d="M68.5 166 q1.5 -12.5 11.5 -15.5 q1.5 10.5 -11.5 15.5 z" />
            <Path strokeWidth="0.85" d="M70 164 q3 -8 8.5 -12 M72.5 159.5 l3.6 0.3" strokeOpacity="0.6" fill="none" />
          </G>
          {/* Scattered seeds: dots and caraway slivers */}
          <G fill={CREAM} stroke="none">
            <Ellipse cx="142" cy="162.5" rx="1.9" ry="1" opacity="0.5" transform="rotate(-24 142 162.5)" />
            <Circle cx="196.5" cy="160" r="1.2" opacity="0.5" />
            <Ellipse cx="86.5" cy="166.5" rx="1.8" ry="0.9" opacity="0.45" transform="rotate(18 86.5 166.5)" />
            <Circle cx="299" cy="168.5" r="1.2" opacity="0.45" />
            <Ellipse cx="186" cy="165.5" rx="1.7" ry="0.9" opacity="0.4" transform="rotate(-40 186 165.5)" />
          </G>
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { overflow: 'hidden' },
});
