import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { Colors, Fonts, Radius, Shadow } from '../../theme';
import Icon from '../../components/Icon';
import Tappable from '../../components/Tappable';
import Sheen from '../../components/Sheen';

type Props = NativeStackScreenProps<RootStackParamList, 'Community'>;

const PREVIEW_ITEMS = [
  { title: 'Grandma’s Sunday Roast', author: 'Maria K.', stars: 5 },
  { title: 'Crispy Korean Fried Chicken', author: 'James L.', stars: 5 },
  { title: 'Summer Peach Galette', author: 'Sofia R.', stars: 4 },
  { title: 'One-Pan Shakshuka', author: 'David M.', stars: 5 },
];

export default function CommunityScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Tappable onPress={() => navigation.goBack()} style={styles.backBtn} scaleTo={0.88} haptic>
          <Icon name="back" size={22} color={Colors.ink} />
        </Tappable>
      </View>

      <Animated.View entering={FadeInDown.delay(60).springify().damping(26).stiffness(220)} style={styles.body}>
        {/* Hero */}
        <View style={styles.heroIconWrap}>
          <Icon name="people" size={38} color={Colors.accentDeep} />
        </View>
        <Text style={styles.heading}>Community Recipes</Text>
        <Text style={styles.sub}>
          Share your favorites, discover what the Just a Pinch family is cooking,
          and rate the week’s top dishes.
        </Text>

        {/* Coming soon badge */}
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeTxt}>Coming Soon</Text>
        </View>

        {/* Blurred preview cards */}
        <View style={styles.previewList}>
          {PREVIEW_ITEMS.map((item, i) => (
            <View key={i} style={[styles.previewCard, Shadow.card]}>
              <View style={styles.previewThumb} />
              <View style={styles.previewBody}>
                <View style={styles.previewTitleBar} />
                <View style={styles.previewByLine} />
                <Text style={styles.previewStars}>{'★'.repeat(item.stars)}</Text>
              </View>
            </View>
          ))}
          {/* Fade-out mask */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={styles.fadeOut} />
          </View>
        </View>

        {/* Subscribe CTA */}
        <Tappable
          style={[styles.ctaBtn, Shadow.cardSoft]}
          scaleTo={0.96}
          haptic
          onPress={() => navigation.navigate('Paywall', { source: 'settings' })}
        >
          <Icon name="sparkle" size={18} color="#fff" />
          <Text style={styles.ctaTxt}>Get Early Access</Text>
          <Sheen radius={Radius.lg} delayMs={600} peak={0.55} />
        </Tappable>
        <Text style={styles.ctaSub}>Subscribers unlock Community when it launches.</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  header: { paddingHorizontal: 16, paddingBottom: 4 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  body: { flex: 1, alignItems: 'center', paddingHorizontal: 28, paddingTop: 24 },

  heroIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  heading: {
    fontFamily: Fonts.displaySemiBold, fontSize: 28, color: Colors.ink,
    letterSpacing: -0.6, textAlign: 'center',
  },
  sub: {
    fontFamily: Fonts.uiRegular, fontSize: 15, color: Colors.ink2,
    textAlign: 'center', lineHeight: 22, marginTop: 10, maxWidth: 320,
  },

  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginTop: 18, paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: Colors.surface2, borderRadius: Radius.pill,
  },
  badgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#F5A623' },
  badgeTxt: { fontFamily: Fonts.uiBold, fontSize: 12.5, color: Colors.ink2, letterSpacing: 0.4 },

  previewList: {
    width: '100%', marginTop: 24, gap: 10, overflow: 'hidden', maxHeight: 220,
  },
  previewCard: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: Radius.md, overflow: 'hidden', opacity: 0.55,
  },
  previewThumb: { width: 72, height: 72, backgroundColor: Colors.line2 },
  previewBody: { flex: 1, padding: 12, gap: 6, justifyContent: 'center' },
  previewTitleBar: { height: 13, borderRadius: 6, backgroundColor: Colors.line, width: '75%' },
  previewByLine: { height: 10, borderRadius: 5, backgroundColor: Colors.line, width: '45%' },
  previewStars: { fontSize: 12, color: '#F5A623', marginTop: 2 },
  fadeOut: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
    // Simple white gradient overlay via backgroundColor with opacity
    backgroundColor: Colors.paper, opacity: 0.85,
  },

  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    marginTop: 22, paddingHorizontal: 28, paddingVertical: 16,
    backgroundColor: Colors.accent, borderRadius: Radius.lg,
    alignSelf: 'stretch', justifyContent: 'center',
  },
  ctaTxt: { fontFamily: Fonts.uiBold, fontSize: 16.5, color: '#fff' },
  ctaSub: {
    fontFamily: Fonts.uiRegular, fontSize: 12.5, color: Colors.ink3,
    textAlign: 'center', marginTop: 12,
  },
});
