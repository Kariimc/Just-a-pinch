import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { Colors, Radius, Fonts } from '../../theme';
import FoodPlaceholder from '../../components/FoodPlaceholder';
import Button from '../../components/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

const SLIDES = [
  {
    variant: 'toast' as const,
    title: 'Save from anywhere',
    body: "A link, a screenshot, a photo of Grandma's index card — it all becomes a clean, cookable recipe.",
  },
  {
    variant: 'greens' as const,
    title: 'Cook hands-free',
    body: 'Step-by-step cooking mode with your screen awake, built-in timers, and voice navigation.',
  },
  {
    variant: 'bread' as const,
    title: 'Plan & shop smart',
    body: 'Build your week, auto-generate a shopping list, and share it with your household in real time.',
  },
];

export default function WelcomeScreen({ navigation }: Props) {
  const [index, setIndex] = useState(0);

  return (
    <View style={styles.container}>
      {/* Skip button */}
      <TouchableOpacity style={styles.skip} onPress={() => navigation.navigate('SignUp')}>
        <Text style={styles.skipTxt}>Skip</Text>
      </TouchableOpacity>

      {/* Slide content */}
      <View style={styles.body}>
        <FoodPlaceholder variant={SLIDES[index].variant} style={styles.illustration} />
        <Text style={styles.title}>{SLIDES[index].title}</Text>
        <Text style={styles.sub}>{SLIDES[index].body}</Text>
      </View>

      {/* Progress dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      {/* CTA footer */}
      <View style={styles.footer}>
        {index < SLIDES.length - 1 ? (
          <Button label="Next" onPress={() => setIndex(i => i + 1)} />
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
  skip: { position: 'absolute', top: 52, right: 18, zIndex: 1 },
  skipTxt: { fontFamily: Fonts.uiSemiBold, fontSize: 14, color: Colors.ink2, height: 34, lineHeight: 34, paddingHorizontal: 12 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  illustration: { width: 200, height: 200, borderRadius: 32 },
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
  footer: { paddingHorizontal: 22, paddingBottom: 36, gap: 14 },
  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  loginTxt: { fontFamily: Fonts.uiRegular, fontSize: 14, color: Colors.ink2 },
  loginLink: { fontFamily: Fonts.uiBold, fontSize: 14, color: Colors.accentDeep },
});
