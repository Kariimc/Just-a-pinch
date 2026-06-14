import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

// Scattered low-opacity food emoji that sit behind a screen as a quiet kitchen
// texture. Extracted from the Settings screen so the same pattern can warm up
// other empty surfaces (the Add-recipe overlay). pointerEvents none — purely
// decorative, never intercepts a tap.

export interface Watermark {
  emoji: string;
  top?: string;
  left?: string;
  right?: string;
  size: number;
  rotate: string;
  opacity: number;
}

// A balanced default scatter. Tuned for a tall surface; positions are
// percentages so it adapts to any height.
const DEFAULT_ITEMS: Watermark[] = [
  { emoji: '🍅', top: '8%', left: '12%', size: 44, rotate: '-16deg', opacity: 0.08 },
  { emoji: '🧄', top: '12%', right: '16%', size: 38, rotate: '20deg', opacity: 0.07 },
  { emoji: '🥕', top: '22%', left: '24%', size: 40, rotate: '-24deg', opacity: 0.08 },
  { emoji: '🫑', top: '26%', right: '22%', size: 42, rotate: '14deg', opacity: 0.07 },
  { emoji: '🍋', top: '34%', left: '14%', size: 36, rotate: '22deg', opacity: 0.07 },
  { emoji: '🥦', top: '38%', right: '12%', size: 44, rotate: '-12deg', opacity: 0.08 },
  { emoji: '🧅', top: '46%', left: '40%', size: 40, rotate: '18deg', opacity: 0.07 },
  { emoji: '🌿', top: '52%', left: '18%', size: 46, rotate: '-10deg', opacity: 0.08 },
  { emoji: '🍳', top: '56%', right: '18%', size: 42, rotate: '16deg', opacity: 0.07 },
  { emoji: '🧂', top: '64%', left: '28%', size: 34, rotate: '-20deg', opacity: 0.07 },
  { emoji: '🫒', top: '68%', right: '26%', size: 38, rotate: '24deg', opacity: 0.07 },
  { emoji: '🥬', top: '74%', left: '14%', size: 44, rotate: '12deg', opacity: 0.08 },
  { emoji: '🍄', top: '80%', right: '14%', size: 40, rotate: '-18deg', opacity: 0.07 },
  { emoji: '🌶️', top: '86%', left: '36%', size: 38, rotate: '20deg', opacity: 0.07 },
];

interface Props {
  items?: Watermark[];
  // 'dark' scales the opacity up so the emoji stay legible over a dim scrim.
  mode?: 'light' | 'dark';
  style?: ViewStyle;
}

export default function FoodWatermark({ items = DEFAULT_ITEMS, mode = 'light', style }: Props) {
  const k = mode === 'dark' ? 2.4 : 1;
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      {items.map((w, i) => (
        <Text
          key={i}
          style={[
            styles.mark,
            {
              top: w.top as any,
              left: w.left as any,
              right: w.right as any,
              fontSize: w.size,
              opacity: Math.min(0.32, w.opacity * k),
              transform: [{ rotate: w.rotate }],
            },
          ]}
        >
          {w.emoji}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { position: 'absolute' },
});
