import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { Colors, Radius, Fonts } from '../../theme';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import { supabase } from '../../lib/supabase';
import { setOnboarded } from '../../store/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

export default function SignUpScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    setError('');
    if (!name || !email || !password) { setError('Please fill in all fields'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (!agreed) { Alert.alert('Please agree to the Terms & Privacy Policy'); return; }
    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email, password, options: { data: { name } },
    });
    setLoading(false);
    if (signUpError) { setError(signUpError.message); return; }
    await setOnboarded();
    navigation.replace('PersonalizationQuiz');
  }

  async function handleApple() {
    const { error: e } = await supabase.auth.signInWithOAuth({ provider: 'apple' });
    if (e) Alert.alert('Apple sign-in failed', e.message);
  }

  async function handleGoogle() {
    const { error: e } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (e) Alert.alert('Google sign-in failed', e.message);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Back */}
      <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
        <Icon name="back" size={20} color={Colors.ink} />
      </TouchableOpacity>

      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.sub}>Free forever for saving & cooking.</Text>

      {/* Social auth */}
      <View style={styles.socials}>
        <Button
          label="Continue with Apple"
          variant="outline"
          onPress={handleApple}
          leadingIcon={<Icon name="apple" size={20} color={Colors.ink} />}
        />
        <Button
          label="Continue with Google"
          variant="outline"
          onPress={handleGoogle}
          leadingIcon={<Icon name="google" size={19} color={Colors.ink} />}
        />
      </View>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.hr} />
        <Text style={styles.orTxt}>or with email</Text>
        <View style={styles.hr} />
      </View>

      {/* Name */}
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Your name"
        placeholderTextColor={Colors.ink3}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />

      {/* Email */}
      <Text style={[styles.label, { marginTop: 13 }]}>Email</Text>
      <TextInput
        style={styles.input}
        placeholder="you@email.com"
        placeholderTextColor={Colors.ink3}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {/* Password */}
      <Text style={[styles.label, { marginTop: 13 }]}>Password</Text>
      <View style={styles.pwdWrap}>
        <TextInput
          style={[styles.input, styles.pwdInput]}
          placeholder="Password (min 6 chars)"
          placeholderTextColor={Colors.ink3}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPwd}
        />
        <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPwd(v => !v)}>
          <Icon name="eyeoff" size={20} color={Colors.ink3} />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorRow}>
          <Icon name="info" size={16} color={Colors.error} />
          <Text style={styles.errorTxt}>{error}</Text>
        </View>
      ) : null}

      {/* Terms */}
      <TouchableOpacity style={styles.termsRow} onPress={() => setAgreed(a => !a)}>
        <View style={[styles.check, agreed && styles.checkOn]}>
          {agreed && <Icon name="check" size={15} color="#fff" />}
        </View>
        <Text style={styles.termsText}>
          I agree to the <Text style={styles.termsLink}>Terms</Text> &amp; <Text style={styles.termsLink}>Privacy Policy</Text>.
        </Text>
      </TouchableOpacity>

      <Button label="Create account" onPress={handleCreate} loading={loading} style={{ marginTop: 10 }} />

      <View style={styles.loginRow}>
        <Text style={styles.sub}>Have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('LogIn')}>
          <Text style={styles.link}>Log In</Text>
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
  socials: { gap: 14, marginTop: 22 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  hr: { flex: 1, height: 1, backgroundColor: Colors.line },
  orTxt: { fontFamily: Fonts.uiRegular, fontSize: 12.5, color: Colors.ink3, letterSpacing: 0.1 },
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
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8 },
  errorTxt: { fontFamily: Fonts.uiSemiBold, fontSize: 13, color: Colors.error },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 16 },
  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: Colors.line2, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  termsText: { fontFamily: Fonts.uiRegular, flex: 1, fontSize: 14, color: Colors.ink2, lineHeight: 20 },
  termsLink: { fontFamily: Fonts.uiBold, color: Colors.ink },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  link: { fontFamily: Fonts.uiBold, fontSize: 14, color: Colors.accentDeep },
});
