import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import Icon from '../../components/Icon';
import { getSettings, saveSettings, AppSettings } from '../../store/settingsStorage';
import { requestNotificationPermission, scheduleDailyReminder, cancelDailyReminder } from '../../lib/notifications';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const MINUTES = [0, 15, 30, 45];

function fmt(h: number, m: number) {
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export default function SettingsScreen({ navigation }: Props) {
  const [settings, setSettings] = useState<AppSettings>({
    notificationsEnabled: false,
    notificationHour: 18,
    notificationMinute: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

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
    const updated = { ...settings, notificationsEnabled: value };
    setSettings(updated);
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
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.root}>
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
                  <Text style={styles.stepBtnTxt}>−</Text>
                </TouchableOpacity>
                <Text style={styles.timeDisplay}>
                  {fmt(settings.notificationHour, settings.notificationMinute)}
                </Text>
                <TouchableOpacity style={styles.stepBtn} onPress={() => adjustHour(1)}>
                  <Text style={styles.stepBtnTxt}>+</Text>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: 14, paddingBottom: 10,
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
    paddingHorizontal: Spacing.md, paddingVertical: 16,
  },
  rowLeft: { flex: 1, marginRight: 12 },
  rowTitle: { fontFamily: Fonts.uiSemiBold, fontSize: 15.5, color: Colors.ink },
  rowSub: { fontFamily: Fonts.uiRegular, fontSize: 13, color: Colors.ink3, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.line, marginHorizontal: Spacing.md },
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
  stepBtnTxt: { fontFamily: Fonts.uiBold, fontSize: 22, color: Colors.ink },
  timeDisplay: {
    fontFamily: Fonts.displayMedium, fontSize: 32, color: Colors.ink, letterSpacing: -0.5,
  },
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
