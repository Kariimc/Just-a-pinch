import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, PressableProps } from 'react-native';
import { Colors, Fonts, Radius, Shadow } from '../theme';

interface Props extends PressableProps {
  label: string;          // tooltip text
  children: React.ReactNode;
}

// A hover tooltip for web (desktop) that degrades to a plain Pressable on
// touch platforms, where hover doesn't exist (discoverability there comes from
// the one-time coach popover + accessibility labels instead). The bubble sits
// above the trigger and never intercepts pointer events.
export default function Tooltip({ label, children, style, ...rest }: Props) {
  const [hovered, setHovered] = useState(false);
  const isWeb = Platform.OS === 'web';

  return (
    <Pressable
      {...rest}
      accessibilityLabel={label}
      style={style}
      onHoverIn={isWeb ? () => setHovered(true) : undefined}
      onHoverOut={isWeb ? () => setHovered(false) : undefined}
    >
      {children}
      {isWeb && hovered && (
        <View style={styles.bubble} pointerEvents="none">
          <Text style={styles.txt} numberOfLines={1}>{label}</Text>
          <View style={styles.arrow} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    bottom: '100%',
    right: 0,
    marginBottom: 9,
    backgroundColor: Colors.ink,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    ...Shadow.cardSoft,
    zIndex: 50,
  },
  txt: {
    fontFamily: Fonts.uiSemiBold,
    fontSize: 12,
    color: Colors.white,
  },
  arrow: {
    position: 'absolute',
    top: '100%',
    right: 14,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.ink,
  },
});
