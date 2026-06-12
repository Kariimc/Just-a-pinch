import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform, Linking, TextInput,
} from 'react-native';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, CommonActions } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, UserProfile } from '../../types';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import Icon from '../../components/Icon';
import { showToast } from '../../components/Toast';
import { getSettings, saveSettings, AppSettings } from '../../store/settingsStorage';
import { getProfile, saveProfile } from '../../store/storage';
import { getBadgeSummary, BadgeSummary } from '../../store/badges';
import BadgeMedallion from '../../components/BadgeMedallion';
import { requestNotificationPermission, scheduleDailyReminder, cancelDailyReminder } from '../../lib/notifications';
import { useAuth } from '../../context/AuthContext';
import { hapticLight } from '../../lib/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const MINUTES = [0, 15, 30, 45];

function fmt(h: number, m: number) {
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export default function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [settings, setSettings] = useState<AppSettings>({
    notificationsEnabled: false,
    notificationHour: 18,
    notificationMinute: 0,
    subscriptionPlan: 'free',
    subscriptionBilling: 'annual',
    largerText: false,
    speakSteps: false,
  });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [badges, setBadges] = useState<BadgeSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [firstInput, setFirstInput] = useState('');
  const [lastInput, setLastInput] = useState('');

  useFocusEffect(useCallback(() => {
    getSettings().then(setSettings);
    getProfile().then(p => {
      setProfile(p);
      // Older profiles stored "First Last" in one field — split it once here
      // so the inputs prefill sensibly; saving writes the split form back.
      const words = (p?.name ?? '').trim().split(/\s+/).filter(Boolean);
      setFirstInput(words[0] ?? '');
      setLastInput(p?.lastName ?? words.slice(1).join(' '));
    });
    getBadgeSummary().then(setBadges);
  }, []));

  async function saveName() {
    if (!profile) return;
    const updated = {
      ...profile,
      name: firstInput.trim() || profile.name,
      lastName: lastInput.trim() || undefined,
    };
    setProfile(updated);
    setEditingName(false);
    await saveProfile(updated);
    showToast('Name updated');
  }

  async function handleNotificationsToggle(value: boolean) {
    if (value && Platform.OS !== 'web') {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Permission required',
          'Enable notifications in your device Settings to use this feature.',
        );
        return;
      }
    }
    setSettings(s => ({ ...s, notificationsEnabled: value }));
  }

  async function toggleMetric(value: boolean) {
    hapticLight();
    if (!profile) return;
    const updated = { ...profile, preferMetric: value };
    setProfile(updated);
    await saveProfile(updated);
  }

  async function adjustHousehold(delta: number) {
    hapticLight();
    if (!profile) return;
    const updated = { ...profile, householdSize: Math.max(1, profile.householdSize + delta) };
    setProfile(updated);
    await saveProfile(updated);
  }

  // Accessibility toggles apply immediately — no Save tap needed.
  async function toggleAccessibility(key: 'largerText' | 'speakSteps', value: boolean) {
    hapticLight();
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveSettings(updated);
  }

  function adjustHour(delta: number) {
    const h = (settings.notificationHour + delta + 24) % 24;
    setSettings(s => ({ ...s, notificationHour: h }));
  }

  function setMinute(m: number) {
    setSettings(s => ({ ...s, notificationMinute: m }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveSettings(settings);
      if (settings.notificationsEnabled) {
        await scheduleDailyReminder(settings.notificationHour, settings.notificationMinute);
      } else {
        await cancelDailyReminder();
      }
      showToast('Settings saved');
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleLogOut() {
    Alert.alert('Log out', 'Your recipes stay synced to your account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out', style: 'destructive',
        onPress: async () => {
          await signOut();
          navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Welcome' }] }));
        },
      },
    ]);
  }

  const version = Constants.expoConfig?.version ?? '1.0.0';

  const WATERMARKS = [
    { emoji: '🍳', top: '6%', left: '5%', size: 52, rotate: '-18deg', opacity: 0.07 },
    { emoji: '🥕', top: '3%', right: '8%', size: 44, rotate: '22deg', opacity: 0.08 },
    { emoji: '🫙', top: '14%', left: '72%', size: 38, rotate: '-8deg', opacity: 0.07 },
    { emoji: '🥑', top: '22%', left: '2%', size: 46, rotate: '30deg', opacity: 0.07 },
    { emoji: '🍋', top: '18%', right: '3%', size: 40, rotate: '-25deg', opacity: 0.08 },
    { emoji: '🧄', top: '31%', left: '60%', size: 50, rotate: '14deg', opacity: 0.07 },
    { emoji: '🫐', top: '38%', left: '8%', size: 42, rotate: '-12deg', opacity: 0.07 },
    { emoji: '🥩', top: '44%', right: '5%', size: 48, rotate: '20deg', opacity: 0.07 },
    { emoji: '🥐', top: '52%', left: '3%', size: 44, rotate: '10deg', opacity: 0.08 },
    { emoji: '🧅', top: '55%', left: '65%', size: 38, rotate: '-20deg', opacity: 0.07 },
    { emoji: '🍅', top: '62%', right: '2%', size: 46, rotate: '28deg', opacity: 0.07 },
    { emoji: '🥚', top: '68%', left: '6%', size: 40, rotate: '-15deg', opacity: 0.08 },
    { emoji: '🧂', top: '72%', left: '55%', size: 42, rotate: '18deg', opacity: 0.07 },
    { emoji: '🍯', top: '78%', right: '6%', size: 44, rotate: '-22deg', opacity: 0.07 },
    { emoji: '🥦', top: '82%', left: '2%', size: 48, rotate: '12deg', opacity: 0.07 },
    { emoji: '🍴', top: '88%', left: '68%', size: 36, rotate: '-8deg', opacity: 0.08 },
    { emoji: '🫚', top: '93%', left: '10%', size: 42, rotate: '25deg', opacity: 0.07 },
    { emoji: '🥣', top: '10%', left: '35%', size: 36, rotate: '-30deg', opacity: 0.06 },
    { emoji: '🍄', top: '48%', left: '38%', size: 34, rotate: '16deg', opacity: 0.06 },
    { emoji: '🧁', top: '76%', left: '30%', size: 40, rotate: '-10deg', opacity: 0.07 },
    // 30 additional watermarks for density
    { emoji: '🍕', top: '4%', left: '22%', size: 36, rotate: '15deg', opacity: 0.07 },
    { emoji: '🫕', top: '7%', right: '20%', size: 40, rotate: '-5deg', opacity: 0.07 },
    { emoji: '🍜', top: '11%', left: '50%', size: 44, rotate: '28deg', opacity: 0.07 },
    { emoji: '🥗', top: '15%', left: '18%', size: 38, rotate: '-20deg', opacity: 0.07 },
    { emoji: '🥜', top: '27%', left: '42%', size: 34, rotate: '-25deg', opacity: 0.07 },
    { emoji: '🫛', top: '33%', right: '18%', size: 42, rotate: '18deg', opacity: 0.07 },
    { emoji: '🥫', top: '36%', left: '22%', size: 38, rotate: '-12deg', opacity: 0.07 },
    { emoji: '🧆', top: '41%', right: '26%', size: 40, rotate: '22deg', opacity: 0.07 },
    { emoji: '🍇', top: '46%', left: '52%', size: 46, rotate: '-8deg', opacity: 0.07 },
    { emoji: '🍊', top: '55%', right: '14%', size: 44, rotate: '-18deg', opacity: 0.07 },
    { emoji: '🫑', top: '59%', left: '40%', size: 40, rotate: '20deg', opacity: 0.07 },
    { emoji: '🌿', top: '64%', left: '12%', size: 46, rotate: '-10deg', opacity: 0.07 },
    { emoji: '🍈', top: '67%', right: '22%', size: 38, rotate: '25deg', opacity: 0.07 },
    { emoji: '🥘', top: '71%', left: '32%', size: 44, rotate: '-15deg', opacity: 0.07 },
    { emoji: '🫘', top: '74%', right: '8%', size: 36, rotate: '8deg', opacity: 0.07 },
    { emoji: '🌶️', top: '77%', left: '56%', size: 42, rotate: '-22deg', opacity: 0.07 },
    { emoji: '🍌', top: '81%', left: '16%', size: 40, rotate: '18deg', opacity: 0.07 },
    { emoji: '🧇', top: '84%', right: '16%', size: 38, rotate: '-12deg', opacity: 0.07 },
    { emoji: '🧈', top: '86%', left: '38%', size: 34, rotate: '28deg', opacity: 0.07 },
    { emoji: '🫒', top: '89%', left: '60%', size: 42, rotate: '-8deg', opacity: 0.07 },
    { emoji: '🌽', top: '92%', right: '26%', size: 48, rotate: '15deg', opacity: 0.07 },
    { emoji: '🥝', top: '95%', left: '26%', size: 36, rotate: '-20deg', opacity: 0.07 },
    { emoji: '🫖', top: '1%', left: '54%', size: 40, rotate: '12deg', opacity: 0.07 },
    { emoji: '🥥', top: '25%', left: '76%', size: 38, rotate: '-18deg', opacity: 0.07 },
    { emoji: '🥬', top: '42%', left: '80%', size: 44, rotate: '22deg', opacity: 0.07 },
    { emoji: '🍎', top: '60%', left: '76%', size: 42, rotate: '-10deg', opacity: 0.07 },
    { emoji: '🫓', top: '78%', left: '74%', size: 36, rotate: '16deg', opacity: 0.07 },
    { emoji: '🍋', top: '21%', left: '44%', size: 32, rotate: '-14deg', opacity: 0.06 },
    { emoji: '🫐', top: '34%', left: '78%', size: 34, rotate: '20deg', opacity: 0.06 },
    { emoji: '🧄', top: '57%', left: '16%', size: 30, rotate: '-28deg', opacity: 0.06 },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top + 6 }]}>
      {/* Food watermarks */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {WATERMARKS.map((w, i) => (
          <Text
            key={i}
            style={[
              styles.watermark,
              {
                top: w.top as any,
                left: w.left as any,
                right: w.right as any,
                fontSize: w.size,
                opacity: w.opacity,
                transform: [{ rotate: w.rotate }],
              },
            ]}
          >
            {w.emoji}
          </Text>
        ))}
      </View>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="back" size={20} color={Colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveTxt}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Account */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTxt}>{(firstInput?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()}</Text>
            </View>
            <View style={styles.rowLeft}>
              {editingName ? (
                <View style={styles.nameInputs}>
                  <TextInput
                    style={styles.nameInput}
                    value={firstInput}
                    onChangeText={setFirstInput}
                    autoFocus
                    returnKeyType="next"
                    placeholder="First name"
                    placeholderTextColor={Colors.ink3}
                  />
                  <TextInput
                    style={styles.nameInput}
                    value={lastInput}
                    onChangeText={setLastInput}
                    returnKeyType="done"
                    onSubmitEditing={saveName}
                    placeholder="Last name"
                    placeholderTextColor={Colors.ink3}
                  />
                </View>
              ) : (
                <Text style={styles.rowTitle}>
                  {[firstInput, lastInput].filter(Boolean).join(' ') || profile?.name || 'Cooking offline'}
                </Text>
              )}
              <Text style={styles.rowSub}>{user?.email ?? 'Recipes stored on this device only'}</Text>
            </View>
            <TouchableOpacity
              onPress={() => editingName ? saveName() : setEditingName(true)}
              style={styles.editNameBtn}
            >
              <Icon name={editingName ? 'check' : 'pencil'} size={16} color={Colors.ink3} />
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Badges')}>
            <View style={styles.badgeCluster}>
              {badges?.latest.length ? (
                badges.latest.map((b, i) => (
                  <View key={b.id} style={i > 0 && styles.badgeOverlap}>
                    <BadgeMedallion metal={b.metal} icon={b.icon} size={32} earned fx="none" />
                  </View>
                ))
              ) : (
                <BadgeMedallion metal="gold" icon="star" size={32} fx="none" />
              )}
            </View>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Badges</Text>
              <Text style={styles.rowSub}>
                {badges
                  ? badges.earnedCount
                    ? `${badges.earnedCount} of ${badges.total} earned`
                    : `${badges.total} to earn — see how`
                  : 'See how to earn them'}
              </Text>
            </View>
            <Icon name="fwd" size={18} color={Colors.ink3} />
          </TouchableOpacity>
          {user && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.row} onPress={handleLogOut}>
                <Text style={[styles.rowTitle, { color: Colors.error }]}>Log out</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Preferences */}
        <Text style={styles.sectionLabel}>Preferences</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Metric units</Text>
              <Text style={styles.rowSub}>Show grams and millilitres by default</Text>
            </View>
            <Switch
              value={profile?.preferMetric ?? false}
              onValueChange={toggleMetric}
              disabled={!profile}
              trackColor={{ false: Colors.line2, true: Colors.accent }}
              thumbColor={Colors.surface}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Household size</Text>
              <Text style={styles.rowSub}>Default servings for plans and scaling</Text>
            </View>
            <View style={styles.stepperSm}>
              <TouchableOpacity style={styles.stepBtnSm} onPress={() => adjustHousehold(-1)} disabled={!profile}>
                <Icon name="minus" size={15} color={Colors.ink} />
              </TouchableOpacity>
              <Text style={styles.stepValSm}>{profile?.householdSize ?? '—'}</Text>
              <TouchableOpacity style={styles.stepBtnSm} onPress={() => adjustHousehold(1)} disabled={!profile}>
                <Icon name="plus" size={15} color={Colors.ink} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Accessibility */}
        <Text style={styles.sectionLabel}>Accessibility</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.accessIcon}>
              <Icon name="textsize" size={19} color={Colors.accentDeep} />
            </View>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Larger text</Text>
              <Text style={styles.rowSub}>Bigger step text in cooking mode</Text>
            </View>
            <Switch
              value={settings.largerText}
              onValueChange={v => toggleAccessibility('largerText', v)}
              trackColor={{ false: Colors.line2, true: Colors.accent }}
              thumbColor={Colors.surface}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.accessIcon}>
              <Icon name="soundwave" size={19} color={Colors.accentDeep} />
            </View>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Read steps aloud</Text>
              <Text style={styles.rowSub}>Speak each step in cooking mode</Text>
            </View>
            <Switch
              value={settings.speakSteps}
              onValueChange={v => toggleAccessibility('speakSteps', v)}
              trackColor={{ false: Colors.line2, true: Colors.accent }}
              thumbColor={Colors.surface}
            />
          </View>
        </View>

        {/* Subscription */}
        <Text style={styles.sectionLabel}>Subscription</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('Paywall', { source: 'settings' })}
          >
            <View style={styles.premiumIcon}>
              <Icon name="sparkle" size={19} color={Colors.accentDeep} />
            </View>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>
                {settings.subscriptionPlan === 'trial' ? 'Premium trial' : 'Just a Pinch Premium'}
              </Text>
              <Text style={styles.rowSub}>
                {settings.subscriptionPlan === 'trial'
                  ? `Active · ${settings.subscriptionBilling} plan`
                  : 'See plans & start a free trial'}
              </Text>
            </View>
            <Icon name="fwd" size={18} color={Colors.ink3} />
          </TouchableOpacity>
        </View>

        {/* Notifications section */}
        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Daily reminder</Text>
              <Text style={styles.rowSub}>Get a nudge to check your meal plan</Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: Colors.line2, true: Colors.accent }}
              thumbColor={Colors.surface}
            />
          </View>

          {settings.notificationsEnabled && (
            <>
              <View style={styles.divider} />

              {/* Hour picker */}
              <Text style={styles.pickerLabel}>Reminder time</Text>
              <View style={styles.timePicker}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => adjustHour(-1)}>
                  <Icon name="minus" size={18} color={Colors.ink} />
                </TouchableOpacity>
                <Text style={styles.timeDisplay}>
                  {fmt(settings.notificationHour, settings.notificationMinute)}
                </Text>
                <TouchableOpacity style={styles.stepBtn} onPress={() => adjustHour(1)}>
                  <Icon name="plus" size={18} color={Colors.ink} />
                </TouchableOpacity>
              </View>

              {/* Minute chips */}
              <View style={styles.minuteRow}>
                {MINUTES.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.minuteChip,
                      settings.notificationMinute === m && styles.minuteChipActive,
                    ]}
                    onPress={() => setMinute(m)}
                  >
                    <Text style={[
                      styles.minuteChipTxt,
                      settings.notificationMinute === m && styles.minuteChipTxtActive,
                    ]}>
                      :{String(m).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        {Platform.OS === 'web' && (
          <View style={styles.webNotice}>
            <Text style={styles.webNoticeTxt}>
              Notifications are only available on the iOS and Android apps.
            </Text>
          </View>
        )}

        {/* About */}
        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Just a Pinch</Text>
              <Text style={styles.rowSub}>Version {version}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.row}
            onPress={() => Linking.openURL('https://github.com/kariimc/just-a-pinch')}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Help &amp; feedback</Text>
            </View>
            <Icon name="fwd" size={18} color={Colors.ink3} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper },
  watermark: { position: 'absolute' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingBottom: 10,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: Radius.pill,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: Fonts.displayMedium, fontSize: 22, color: Colors.ink, letterSpacing: -0.3 },
  saveBtn: {
    paddingHorizontal: 18, height: 36, borderRadius: Radius.pill,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveTxt: { fontFamily: Fonts.uiBold, fontSize: 14, color: Colors.surface },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 80 },
  sectionLabel: {
    fontFamily: Fonts.uiBold, fontSize: 11.5, letterSpacing: 0.8,
    color: Colors.ink3, textTransform: 'uppercase', marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.line, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 16, gap: 12,
  },
  rowLeft: { flex: 1, marginRight: 12 },
  rowTitle: { fontFamily: Fonts.uiSemiBold, fontSize: 15.5, color: Colors.ink },
  rowSub: { fontFamily: Fonts.uiRegular, fontSize: 13, color: Colors.ink3, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.line, marginHorizontal: Spacing.md },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { fontFamily: Fonts.uiBold, color: '#fff', fontSize: 16 },
  nameInputs: { gap: 6, marginBottom: 2 },
  nameInput: {
    fontFamily: Fonts.uiSemiBold, fontSize: 15.5, color: Colors.ink,
    borderBottomWidth: 1.5, borderBottomColor: Colors.accent,
    paddingVertical: 2,
    // The green underline is the focus affordance — suppress the browser's
    // default black focus outline that react-native-web leaves on inputs.
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  editNameBtn: { padding: 8 },
  badgeCluster: { flexDirection: 'row', alignItems: 'center' },
  badgeOverlap: { marginLeft: -11 },
  premiumIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  accessIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  pickerLabel: {
    fontFamily: Fonts.uiSemiBold, fontSize: 13, color: Colors.ink2,
    paddingHorizontal: Spacing.md, paddingTop: 14, marginBottom: 8,
  },
  timePicker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, marginBottom: 12,
  },
  stepBtn: {
    width: 44, height: 44, borderRadius: Radius.pill,
    backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center',
  },
  timeDisplay: {
    fontFamily: Fonts.displayMedium, fontSize: 32, color: Colors.ink, letterSpacing: -0.5,
  },
  stepperSm: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.line2,
    borderRadius: Radius.pill, overflow: 'hidden',
  },
  stepBtnSm: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  stepValSm: { fontFamily: Fonts.uiBold, minWidth: 36, textAlign: 'center', fontSize: 14.5, color: Colors.ink },
  minuteRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.md, paddingBottom: 16,
  },
  minuteChip: {
    flex: 1, height: 38, borderRadius: Radius.sm,
    backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.line,
  },
  minuteChipActive: {
    backgroundColor: Colors.accentSoft, borderColor: Colors.accent,
  },
  minuteChipTxt: { fontFamily: Fonts.uiBold, fontSize: 14, color: Colors.ink2 },
  minuteChipTxtActive: { color: Colors.accentInk },
  webNotice: {
    marginTop: Spacing.md, padding: 14,
    backgroundColor: Colors.surface2, borderRadius: Radius.md,
  },
  webNoticeTxt: { fontFamily: Fonts.uiRegular, fontSize: 13.5, color: Colors.ink2, textAlign: 'center' },
});
