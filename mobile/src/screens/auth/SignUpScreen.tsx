import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { Colors, Radius, Spacing } from '../../theme';
import Button from '../../components/Button';
import { saveProfile, setOnboarded } from '../../store/storage';
import { uid } from '../../utils/id';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

export default function SignUpScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name || !email || !password) { Alert.alert('Please fill in all fields'); return; }
    if (!agreed) { Alert.alert('Please agree to the Terms & Privacy Policy'); return; }
    setLoading(true);
    await saveProfile({
      id: uid(), name, email, avatarUri: undefined,
      dietaryPrefs: [], skillLevel: 'confident',
      householdSize: 2, preferMetric: false, darkMode: false,
    });
    await setOnboarded();
    setLoading(false);
    navigation.replace('PersonalizationQuiz');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backTxt}>←</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.sub}>Free forever for saving & cooking.</Text>

      <View style={styles.socials}>
        <Button label="Continue with Apple" variant="outline" onPress={() => {}} style={styles.socialBtn} />
        <Button label="Continue with Google" variant="outline" onPress={() => {}} style={styles.socialBtn} />
      </View>

      <View style={styles.divider}>
        <View style={styles.hr} />
        <Text style={styles.orTxt}>or with email</Text>
        <View style={styles.hr} />
      </View>

      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} placeholder="Your name" value={name} onChangeText={setName} autoCapitalize="words" />

      <Text style={[styles.label, { marginTop: 13 }]}>Email</Text>
      <TextInput style={styles.input} placeholder="you@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

      <Text style={[styles.label, { marginTop: 13 }]}>Password</Text>
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

      <TouchableOpacity style={styles.termsRow} onPress={() => setAgreed(a => !a)}>
        <View style={[styles.check, agreed && styles.checkOn]}>
          {agreed && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
        </View>
        <Text style={styles.termsText}>
          I agree to the <Text style={styles.termsLink}>Terms</Text> & <Text style={styles.termsLink}>Privacy Policy</Text>.
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
  back: { marginBottom: 8 },
  backTxt: { fontSize: 22, color: Colors.ink },
  title: { fontSize: 26, fontWeight: '600', color: Colors.ink, letterSpacing: -0.3 },
  sub: { fontSize: 14, color: Colors.ink2, marginTop: 6 },
  socials: { gap: Spacing.md, marginTop: 22 },
  socialBtn: { marginBottom: 0 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  hr: { flex: 1, height: 1, backgroundColor: Colors.line },
  orTxt: { fontSize: 12.5, color: Colors.ink3 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.ink2, marginBottom: 7 },
  input: {
    width: '100%', height: 52, paddingHorizontal: 16, fontSize: 16,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.line2,
    borderRadius: Radius.md, color: Colors.ink,
  },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 16 },
  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: Colors.line2, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  termsText: { flex: 1, fontSize: 14, color: Colors.ink2, lineHeight: 20 },
  termsLink: { fontWeight: '700', color: Colors.ink },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  link: { fontWeight: '700', fontSize: 14, color: Colors.accentDeep },
});
