import React from 'react';
import { ViewStyle } from 'react-native';
import Svg, {
  Defs, LinearGradient, Stop, Rect, Path, Circle, G,
} from 'react-native-svg';

// A whimsical, hand-illustrated family-cookbook cover: a cloth-bound green
// board with a gold double-rule frame and playful kitchen doodles (a steaming
// pot, a whisk, a herb sprig, little sparkles). A built-in bottom scrim keeps
// overlaid white title text readable. Pure vector — crisp at any size, themed,
// no bundled image. Drawn in a 340×150 box, sliced to cover the card.
interface Props {
  style?: ViewStyle;
}

// Warm gold used for the frame and line-art doodles.
const GOLD = '#F4E2BC';

export default function CookbookCover({ style }: Props) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 340 150" preserveAspectRatio="xMidYMid slice" style={style}>
      <Defs>
        <LinearGradient id="cookBg" x1="0" y1="0" x2="0.3" y2="1">
          <Stop offset="0" stopColor="#37A862" />
          <Stop offset="0.55" stopColor="#1F7A43" />
          <Stop offset="1" stopColor="#114B29" />
        </LinearGradient>
        <LinearGradient id="cookScrim" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0.45" stopColor="#06160C" stopOpacity="0" />
          <Stop offset="1" stopColor="#04120A" stopOpacity="0.6" />
        </LinearGradient>
      </Defs>

      {/* Cloth board + soft top sheen */}
      <Rect x="0" y="0" width="340" height="150" fill="url(#cookBg)" />
      <Rect x="0" y="0" width="340" height="66" fill="#FFFFFF" opacity="0.05" />

      {/* Gold double-rule frame */}
      <Rect x="12" y="12" width="316" height="126" rx="13" fill="none" stroke={GOLD} strokeOpacity="0.5" strokeWidth="2" />
      <Rect x="16.5" y="16.5" width="307" height="117" rx="10" fill="none" stroke={GOLD} strokeOpacity="0.24" strokeWidth="1" />

      {/* Doodles — kept in the top two-thirds; the scrim fades the rest */}
      <G stroke={GOLD} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Steaming pot, centre */}
        <Path d="M151 84 L153 60 L187 60 L189 84 Q170 92 151 84 Z" fill={GOLD} fillOpacity="0.13" />
        <Path d="M146 60 Q170 50 194 60" />
        <Path d="M150 60 L150 65 M190 60 L190 65" />
        <Path d="M163 49 q-6 -7 0 -13 q6 -6 0 -12" strokeOpacity="0.85" />
        <Path d="M177 49 q6 -7 0 -13 q-6 -6 0 -12" strokeOpacity="0.85" />

        {/* Herb sprig, upper-left */}
        <Path d="M60 92 Q70 64 92 50" />
        <Path d="M74 70 q9 -9 18 -7 q-4 11 -18 7 Z" fill={GOLD} fillOpacity="0.16" />
        <Path d="M67 80 q-9 -6 -16 -3 q5 10 16 3 Z" fill={GOLD} fillOpacity="0.16" />

        {/* Whisk, upper-right */}
        <Path d="M257 30 L246 56" />
        <Path d="M255 33 Q236 42 244 60" strokeWidth="1.8" />
        <Path d="M257 33 Q246 44 248 60" strokeWidth="1.8" />
        <Path d="M259 33 Q256 46 252 60" strokeWidth="1.8" />
        <Path d="M244 60 L252 60" strokeWidth="1.8" />
      </G>

      {/* Sparkles + crumbs */}
      <G fill={GOLD}>
        <Path d="M118 32 Q121 35 124 32 Q121 35 124 38 Q121 35 118 38 Q121 35 118 32 Z" />
        <Path d="M214 26 Q216.5 28.5 219 26 Q216.5 28.5 219 31 Q216.5 28.5 214 31 Q216.5 28.5 214 26 Z" />
        <Path d="M286 74 Q289 77 292 74 Q289 77 292 80 Q289 77 286 80 Q289 77 286 74 Z" opacity="0.85" />
        <Circle cx="103" cy="60" r="1.6" opacity="0.6" />
        <Circle cx="232" cy="58" r="1.6" opacity="0.6" />
        <Circle cx="276" cy="48" r="1.6" opacity="0.55" />
        <Circle cx="49" cy="58" r="1.6" opacity="0.55" />
      </G>

      {/* Bottom scrim for legible title text */}
      <Rect x="0" y="0" width="340" height="150" fill="url(#cookScrim)" />
    </Svg>
  );
}
