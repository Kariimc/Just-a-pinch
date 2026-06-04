import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { Colors, Radius, Spacing } from '../../theme';
import Button from '../../components/Button';
import { getProfile, setOnboarded } from '../../store/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'LogIn'>;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError('');
    if (!email || !password) { setError('Please enter email and password'); return; }
    setLoading(true);
    const profile = await getProfile();
    await new Promise(r => setTimeout(r, 600));
    setLoading(false);
    if (profile && profile.email === email) {
      await setOnboarded();
      navigation.replace('Main');
    } else {
      setError("That password doesn't match. Try again.");
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backTxt}>←</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.sub}>Pick up right where you left the pot.</Text>

      <View style={styles.socials}>
        <Button label="Continue with Apple" variant="outline" onPress={() => {}} style={{ marginBottom: 0 }} />
        <Button label="Continue with Google" variant="outline" onPress={() => {}} style={{ marginBottom: 0 }} />
      </View>

      <View style={styles.divider}>
        <View style={styles.hr} /><Text style={styles.orTxt}>or</Text><View style={styles.hr} />
      </View>

      <Text style={styles.label}>Email</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@email.com" />

      <Text style={[styles.label, { marginTop: 13 }]}>Password</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        value={password} onChangeText={setPassword} secureTextEntry placeholder="Password"
      />
      {error ? <Text style={styles.errorTxt}>{error}</Text> : null}

      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotRow}>
        <Text style={styles.link}>Forgot password?</Text>
      </TouchableOpacity>

      <Button label="Log In" onPress={handleLogin} loading={loading} />

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
  content: { padding: 22, paddingTop: 56, paddingBottom: 36, gap: 0 },
  backTxt: { fontSize: 22, color: Colors.ink, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '600', color: Colors.ink, letterSpacing: -0.3 },
  sub: { fontSize: 14, color: Colors.ink2, marginTop: 6 },
  socials: { gap: Spacing.md, marginTop: 22 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  hr: { flex: 1, height: 1, backgroundColor: Colors.line },
  orTxt: { fontSize: 12.5, color: Colors.ink3 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.ink2, marginBottom: 7 },
  input: { width: '100%', height: 52, paddingHorizontal: 16, fontSize: 16, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.line2, borderRadius: Radius.md, color: Colors.ink },
  inputError: { borderColor: Colors.error },
  errorTxt: { color: Colors.error, fontSize: 13, fontWeight: '600', marginTop: 6 },
  forgotRow: { alignItems: 'flex-end', marginTop: 12, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  link: { fontWeight: '700', fontSize: 13.5, color: Colors.accentDeep },
});
