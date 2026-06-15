import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { Colors, Fonts, Radius, Shadow } from '../theme';
import { Springs } from '../theme/motion';

interface Props {
  name: string;
  recipeCount: number;
  onPress?: () => void;
}

export default function CookbookHero({ name, recipeCount, onPress }: Props) {
  const logoScale = useSharedValue(1);
  const cardScale = useSharedValue(1);

  function handlePress() {
    cardScale.value = withSequence(
      withSpring(0.97, Springs.press),
      withSpring(1, Springs.glide),
    );
    logoScale.value = withSequence(
      withTiming(1.12, { duration: 180 }),
      withSpring(0.97, { damping: 14, stiffness: 340, mass: 0.9 }),
      withSpring(1, Springs.glide),
    );
    onPress?.();
  }

  const displayName = (name || 'Our').toUpperCase();
  const countLabel = `${recipeCount} recipe${recipeCount === 1 ? '' : 's'} saved`;

  return (
    <Animated.View style={[styles.card, Shadow.cardSoft, { transform: [{ scale: cardScale }] }]}>
      <TouchableOpacity activeOpacity={1} onPress={handlePress} style={styles.inner}>

        <View style={styles.accentBar} />

        <View style={styles.body}>
          <Text style={styles.eyebrow}>Family Collection</Text>
          <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
          <Text style={styles.subtitle}>Family Cookbook</Text>
          <View style={styles.rule} />
          <View style={styles.metaRow}>
            <View style={styles.dot} />
            <Text style={styles.meta}>{countLabel}</Text>
          </View>
        </View>

        <View style={styles.logoPanel}>
          <View style={styles.ring1} />
          <View style={styles.ring2} />
          <Animated.Image
            source={require('../../assets/logo1.png')}
            style={[styles.logo, { transform: [{ scale: logoScale }] }]}
            resizeMode="contain"
          />
        </View>

      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.line,
    backgroundColor: Colors.paper,
  },
  inner: {
    flexDirection: 'row',
    height: 210,
  },
  accentBar: {
    width: 6,
    backgroundColor: Colors.accent,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
    paddingLeft: 24,
    paddingRight: 18,
  },
  eyebrow: {
    fontFamily: Fonts.uiBold,
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: Colors.accentDeep,
    marginBottom: 8,
  },
  name: {
    fontFamily: Fonts.displayMedium,
    fontSize: 36,
    color: Colors.ink,
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  subtitle: {
    fontFamily: Fonts.displayRegularItalic,
    fontSize: 15,
    color: Colors.ink2,
    marginTop: 3,
  },
  rule: {
    width: 36,
    height: 1.5,
    backgroundColor: Colors.line,
    marginVertical: 12,
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
    backgroundColor: Colors.accent,
  },
  meta: {
    fontFamily: Fonts.uiSemiBold,
    fontSize: 12,
    color: Colors.ink3,
  },
  logoPanel: {
    width: 110,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ring1: {
    position: 'absolute',
    width: 98,
    height: 98,
    borderRadius: 49,
    borderWidth: 1,
    borderColor: 'rgba(46,158,87,0.22)',
  },
  ring2: {
    position: 'absolute',
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 1,
    borderColor: 'rgba(46,158,87,0.10)',
  },
  logo: {
    width: 72,
    height: 72,
  },
});
