import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { Colors, Fonts } from '../../theme';
import OnboardingArt from '../../components/OnboardingArt';
import Button from '../../components/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

const SLIDES = [
  {
    variant: 'capture' as const,
    title: 'Save from anywhere',
    body: "A link, a screenshot, a photo of Grandma's index card — it all becomes a clean, cookable recipe.",
  },
  {
    variant: 'cook' as const,
    title: 'Cook hands-free',
    body: 'Step-by-step cooking mode with your screen awake and built-in timers.',
  },
  {
    variant: 'plan' as const,
    title: 'Plan & shop smart',
    body: 'Build your week, then generate a shopping list from it in one tap.',
  },
];

export default function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(Math.max(0, Math.min(SLIDES.length - 1, i)));
  }

  function goNext() {
    if (index >= SLIDES.length - 1) {
      navigation.navigate('SignUp');
      return;
    }
    const next = index + 1;
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setIndex(next);
  }

  return (
    <View style={styles.container}>
      {/* Skip button */}
      <TouchableOpacity style={[styles.skip, { top: insets.top + 8 }]} onPress={() => navigation.navigate('SignUp')}>
        <Text style={styles.skipTxt}>Skip</Text>
      </TouchableOpacity>

      {/* Swipeable slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={Platform.OS === 'web' ? 16 : 64}
        style={{ flex: 1 }}
      >
        {SLIDES.map(slide => (
          <View key={slide.title} style={[styles.body, { width }]}>
            <OnboardingArt variant={slide.variant} width={Math.min(width - 80, 300)} />
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.sub}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Progress dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      {/* CTA footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}>
        {index < SLIDES.length - 1 ? (
          <Button label="Next" onPress={goNext} />
        ) : (
          <Button label="Get Started" onPress={() => navigation.navigate('SignUp')} />
        )}
        <View style={styles.loginRow}>
          <Text style={styles.loginTxt}>I already have an account · </Text>
          <TouchableOpacity onPress={() => navigation.navigate('LogIn')}>
            <Text style={styles.loginLink}>Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  skip: { position: 'absolute', right: 18, zIndex: 1 },
  skipTxt: { fontFamily: Fonts.uiSemiBold, fontSize: 14, color: Colors.ink2, height: 34, lineHeight: 34, paddingHorizontal: 12 },
  body: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  title: {
    fontFamily: Fonts.displayMedium,
    fontSize: 26,
    lineHeight: 29.6,
    letterSpacing: -0.13,
    color: Colors.ink,
    marginTop: 30,
    textAlign: 'center',
  },
  sub: {
    fontFamily: Fonts.uiRegular,
    fontSize: 14,
    color: Colors.ink2,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 18 },
  dot: { width: 7, height: 7, borderRadius: 99, backgroundColor: Colors.line2 },
  dotActive: { width: 22, backgroundColor: Colors.accent },
  footer: { paddingHorizontal: 22, gap: 14 },
  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  loginTxt: { fontFamily: Fonts.uiRegular, fontSize: 14, color: Colors.ink2 },
  loginLink: { fontFamily: Fonts.uiBold, fontSize: 14, color: Colors.accentDeep },
});
