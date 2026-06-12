import React, { useEffect } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { supabase } from '../../lib/supabase';
import { Fonts } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

// Static brand beat: long enough to register, short enough to never feel stuck.
const MIN_SPLASH_MS = 1800;

export default function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    let cancelled = false;
    const start = Date.now();
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const wait = Math.max(0, MIN_SPLASH_MS - (Date.now() - start));
      setTimeout(() => {
        if (!cancelled) navigation.replace(session ? 'Main' : 'Welcome');
      }, wait);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../../assets/logo3.png')}
        style={styles.logo}
        resizeMode="contain"
        tintColor="#fff"
      />
      <Text style={styles.tagline}>your kitchen, remembered</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // Matches the native splash background so the handoff is seamless
    backgroundColor: '#1E7A41',
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
});
