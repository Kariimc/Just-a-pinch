import React, { useEffect, useRef } from 'react';
import { View, Image, Text, StyleSheet, Animated } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { supabase } from '../../lib/supabase';
import { Fonts } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export default function SplashScreen({ navigation }: Props) {
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: 1,
      duration: 1800,
      useNativeDriver: false,
    }).start();

    const timer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      navigation.replace(session ? 'Main' : 'Welcome');
    }, 2400);
    return () => clearTimeout(timer);
  }, []);

  const barWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ['20%', '75%'] });

  return (
    <View style={styles.container}>
      <Image
        source={require('../../../assets/logo3.png')}
        style={styles.logo}
        resizeMode="contain"
        tintColor="#fff"
      />
      <Text style={styles.tagline}>your kitchen, remembered</Text>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { width: barWidth }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // Matches the design's radial-gradient(120% 90% at 50% 32%, #2E9E57 0%, #1b6b3b 56%, #134d2a 100%)
    backgroundColor: '#1E7A41',
    position: 'relative',
  },
  logo: {
    width: 220,
    height: 204, // ~1.08 aspect ratio per design token --logo-ar
  },
  tagline: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    fontStyle: 'italic',
    fontFamily: Fonts.displayRegularItalic,
    marginTop: 18,
  },
  barTrack: {
    position: 'absolute',
    bottom: 54,
    width: 130,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 999,
  },
});
