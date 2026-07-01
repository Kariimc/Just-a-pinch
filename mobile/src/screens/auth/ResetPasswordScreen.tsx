import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Fonts } from '../../theme';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import { showToast } from '../../components/Toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

// Shown when the user taps a password-recovery link. By this point the deep
// link handler has exchanged the code, so there's an active recovery session
// and we only need to set the new password.
export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { clearRecovery, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleUpdate() {
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) { setError(updateError.message); return; }
      showToast('Password updated', 'check');
      clearRecovery();
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.iconWrap}>
        <Icon name="lock" size={26} color={Colors.accentDeep} />
      </View>
      <Text style={styles.title}>Set a new password</Text>
      <Text style={styles.sub}>Choose something you'll remember — you're already verified.</Text>

      <Text style={[styles.label, { marginTop: 24 }]}>New password</Text>
      <View style={styles.pwdWrap}>
        <TextInput
          style={[styles.input, styles.pwdInput, error ? styles.inputError : null]}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPwd}
          placeholder="New password (min 6 chars)"
          placeholderTextColor={Colors.ink3}
          autoFocus
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

      <Button label="Update password" onPress={handleUpdate} loading={loading} style={{ marginTop: 20 }} />

      <TouchableOpacity style={styles.cancelRow} onPress={async () => { await signOut(); }}>
        <Text style={styles.cancelTxt}>Cancel and log in differently</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  content: { padding: 22, paddingBottom: 36 },
  iconWrap: {
    width: 60, height: 60, borderRadius: Radius.pill,
    backgroundColor: Colors.accentSoft, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: Fonts.displayMedium, fontSize: 26, letterSpacing: -0.13, color: Colors.ink, marginTop: 18 },
  sub: { fontFamily: Fonts.uiRegular, fontSize: 14, color: Colors.ink2, marginTop: 6, lineHeight: 20 },
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
  cancelRow: { alignItems: 'center', marginTop: 18 },
  cancelTxt: { fontFamily: Fonts.uiBold, fontSize: 13.5, color: Colors.ink2 },
});
