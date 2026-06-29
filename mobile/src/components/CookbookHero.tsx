import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withSpring,
} from 'react-native-reanimated';
import { Colors, Fonts, Radius, Shadow } from '../theme';
import { Springs } from '../theme/motion';
import Icon from './Icon';
import CookbookCover from './CookbookCover';

interface Props {
  name: string;
  recipeCount: number;
  coverImageUri?: string;
  onPress?: () => void;
  onChangeCover?: () => void;
}

const CREAM = '#F1E9D5';        // embossed title ink on the green cloth
const CREAM_DIM = '#D8E4D2';

// Possessive form of the family name for the cover:
//   "Chiles" → "CHILES'"   (ends in s — trailing apostrophe only)
//   "Smith"  → "SMITH'S"
// Empty name falls back to "OUR" (no possessive).
function possessive(raw: string): string {
  const name = raw.trim().toUpperCase();
  if (!name) return 'OUR';
  return /S$/.test(name) ? `${name}'` : `${name}'S`;
}

export default function CookbookHero({ name, recipeCount, coverImageUri, onPress, onChangeCover }: Props) {
  const cardScale = useSharedValue(1);

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));

  function handlePress() {
    cardScale.value = withSequence(
      withSpring(0.97, Springs.press),
      withSpring(1, Springs.glide),
    );
    onPress?.();
  }

  const title = possessive(name);
  const countLabel = `${recipeCount} recipe${recipeCount === 1 ? '' : 's'} saved`;

  return (
    <Animated.View style={[styles.card, Shadow.cardSoft, cardStyle]}>
      <TouchableOpacity activeOpacity={0.92} onPress={handlePress} style={styles.inner}>

        {/* Background: the engraved cookbook cover (vector — crisp at any width,
            themes with the app, bundles offline). A custom photo, if the user
            picked one, replaces it under a dark scrim so the title stays legible. */}
        {coverImageUri ? (
          <>
            <Image source={{ uri: coverImageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <View style={styles.photoScrim} />
          </>
        ) : (
          <CookbookCover style={StyleSheet.absoluteFill} />
        )}

        {/* Centred embossed title block */}
        <View style={styles.body}>
          <Text style={styles.eyebrow}>The</Text>
          <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{title}</Text>
          <Text style={styles.subtitle}>Family Cookbook</Text>
          <View style={styles.rule} />
          <View style={styles.metaRow}>
            <View style={styles.dot} />
            <Text style={styles.meta}>{countLabel}</Text>
          </View>
        </View>

      </TouchableOpacity>

      {/* Camera button sits outside the main tap so it doesn't trigger navigation */}
      {onChangeCover && (
        <TouchableOpacity style={styles.cameraBtn} onPress={onChangeCover} hitSlop={10}>
          <Icon name="camera" size={13} color="#fff" />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.line,
    backgroundColor: Colors.accentDeep,
  },
  inner: {
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoScrim: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(18,62,34,0.52)',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  eyebrow: {
    fontFamily: Fonts.displayRegularItalic,
    fontSize: 15,
    color: CREAM_DIM,
    marginBottom: 2,
    // soft emboss so cream reads cleanly over the engraved botanicals
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  name: {
    fontFamily: Fonts.displaySemiBold,
    fontSize: 42,
    color: CREAM,
    letterSpacing: 0.5,
    lineHeight: 46,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontFamily: Fonts.uiSemiBold,
    fontSize: 11,
    letterSpacing: 3.6,
    textTransform: 'uppercase',
    color: CREAM_DIM,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  rule: {
    width: 44,
    height: 1.5,
    backgroundColor: 'rgba(241,233,213,0.5)',
    marginVertical: 11,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: CREAM,
  },
  meta: {
    fontFamily: Fonts.uiSemiBold,
    fontSize: 12,
    color: CREAM_DIM,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
