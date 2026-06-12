import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { Colors, Radius, Fonts } from '../../theme';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import SocialAuthButtons from '../../components/SocialAuthButtons';
import { supabase } from '../../lib/supabase';
import { authRedirectUrl } from '../../lib/authRedirect';
import { setOnboarded } from '../../store/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'LogIn'>;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleLogin() {
    setError('');
    if (!email || !password) { setError('Please enter email and password'); return; }
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      const m = signInError.message.toLowerCase();
      if (m.includes('not confirmed')) {
        setError('Confirm your email first — check your inbox for the link.');
      } else if (m.includes('invalid')) {
        setError("Email or password doesn't match. Try again.");
      } else {
        // Surface the real reason (network, rate limit, etc.) instead of guessing
        setError(signInError.message);
      }
      return;
    }
    await setOnboarded();
    navigation.replace('Main');
  }

  async function handleForgotPassword() {
    if (!email) { setError('Enter your email above first'); return; }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authRedirectUrl,
    });
    if (resetError) { setError(resetError.message); return; }
    setResetSent(true);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Back button */}
      <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
        <Icon name="back" size={20} color={Colors.ink} />
      </TouchableOpacity>

      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.sub}>Pick up right where you left the pot.</Text>

      {/* Email */}
      <Text style={[styles.label, { marginTop: 24 }]}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="you@email.com"
        placeholderTextColor={Colors.ink3}
      />

      {/* Password */}
      <Text style={[styles.label, { marginTop: 13 }]}>Password</Text>
      <View style={styles.pwdWrap}>
        <TextInput
          style={[styles.input, styles.pwdInput, error ? styles.inputError : null]}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPwd}
          placeholder="Password"
          placeholderTextColor={Colors.ink3}
        />
        <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPwd(v => !v)}>
          <Icon name="eyeoff" size={20} color={Colors.ink3} />
        </TouchableOpacity>
      </View>

      {/* Error */}
      {error ? (
        <View style={styles.errorRow}>
          <Icon name="info" size={16} color={Colors.error} />
          <Text style={styles.errorTxt}>{error}</Text>
        </View>
      ) : null}

      {/* Forgot password */}
      <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotRow}>
        <Text style={styles.link}>{resetSent ? 'Reset email sent ✓' : 'Forgot password?'}</Text>
      </TouchableOpacity>

      <Button label="Log In" onPress={handleLogin} loading={loading} />

      <SocialAuthButtons onSuccess={() => navigation.replace('Main')} />

      <View style={styles.row}>
        <Text style={styles.sub}>New here? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.link}>Create an account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  content: { padding: 22, paddingTop: 56, paddingBottom: 36 },
  iconBtn: {
    width: 44, height: 44, borderRadius: Radius.pill,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.line,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  title: { fontFamily: Fonts.displayMedium, fontSize: 26, lineHeight: 29.6, letterSpacing: -0.13, color: Colors.ink, marginTop: 18 },
  sub: { fontFamily: Fonts.uiRegular, fontSize: 14, color: Colors.ink2, marginTop: 6 },
  label: { fontFamily: Fonts.uiSemiBold, fontSize: 13, color: Colors.ink2, marginBottom: 7 },
  input: {
    width: '100%', height: 52, paddingHorizontal: 16,
    fontFamily: Fonts.uiRegular, fontSize: 16,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.line2,
    borderRadius: Radius.md, color: Colors.ink,
  },
  pwdWrap: { position: 'relative' },
  pwdInput: { paddingRight: 48 },
  eyeBtn: { position: 'absolute', right: 14, top: 14 },
  inputError: { borderColor: Colors.error },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8 },
  errorTxt: { fontFamily: Fonts.uiSemiBold, fontSize: 13, color: Colors.error },
  forgotRow: { alignItems: 'flex-end', marginTop: 12, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  link: { fontFamily: Fonts.uiBold, fontSize: 13.5, color: Colors.accentDeep },
});
