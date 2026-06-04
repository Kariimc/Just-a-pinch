import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { isOnboarded } from '../../store/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export default function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    const timer = setTimeout(async () => {
      const done = await isOnboarded();
      navigation.replace(done ? 'Main' : 'Welcome');
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Just a Pinch</Text>
      <Text style={styles.tagline}>your kitchen, remembered</Text>
      <View style={styles.barTrack}>
        <View style={styles.barFill} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E7A41',
  },
  logo: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  tagline: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 14,
  },
  barTrack: {
    position: 'absolute',
    bottom: 54,
    width: 130,
    height: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  barFill: {
    width: '62%',
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 99,
  },
});
