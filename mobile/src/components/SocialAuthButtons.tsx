import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, ViewStyle } from 'react-native';
import Tappable from './Tappable';
import Icon from './Icon';
import { Colors, Radius, Fonts } from '../theme';
import { signInWithApple, signInWithGoogle, SocialProvider } from '../lib/socialAuth';

interface Props {
  // Called once a provider returns a real Supabase session.
  onSuccess: () => void;
  style?: ViewStyle;
}

export default function SocialAuthButtons({ onSuccess, style }: Props) {
  const [busy, setBusy] = useState<SocialProvider | null>(null);

  async function run(provider: SocialProvider, fn: () => Promise<void>) {
    if (busy) return;
    setBusy(provider);
    try {
      await fn();
      onSuccess();
    } catch (e: any) {
      // A user dismissing the Apple/Google sheet isn't an error worth surfacing.
      if (e?.code === 'ERR_REQUEST_CANCELED' || e?.code === 'ERR_CANCELED') return;
      Alert.alert('Sign in', e?.message ?? 'Could not sign in. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={style}>
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.dividerTxt}>or continue with</Text>
        <View style={styles.line} />
      </View>

      <View style={styles.row}>
        <Tappable
          style={[styles.btn, styles.apple]}
          scaleTo={0.96}
          disabled={!!busy}
          onPress={() => run('apple', signInWithApple)}
        >
          {busy === 'apple' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="apple" size={20} color="#fff" />
              <Text style={[styles.label, styles.appleLabel]}>Apple</Text>
            </>
          )}
        </Tappable>

        <Tappable
          style={[styles.btn, styles.google]}
          scaleTo={0.96}
          disabled={!!busy}
          onPress={() => run('google', signInWithGoogle)}
        >
          {busy === 'google' ? (
            <ActivityIndicator color={Colors.ink} />
          ) : (
            <>
              <Icon name="google" size={20} />
              <Text style={styles.label}>Google</Text>
            </>
          )}
        </Tappable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 },
  line: { flex: 1, height: 1, backgroundColor: Colors.line2 },
  dividerTxt: { fontFamily: Fonts.uiMedium, fontSize: 12.5, color: Colors.ink3 },
  row: { flexDirection: 'row', gap: 12 },
  btn: {
    flex: 1,
    height: 52,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  apple: { backgroundColor: Colors.ink },
  google: { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.line2 },
  label: { fontFamily: Fonts.uiSemiBold, fontSize: 15, color: Colors.ink },
  appleLabel: { color: Colors.white },
});
