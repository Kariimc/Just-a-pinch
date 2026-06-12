import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@jap_settings';

export interface AppSettings {
  notificationsEnabled: boolean;
  notificationHour: number;
  notificationMinute: number;
  // Local subscription state — no payment processor is wired yet, so the
  // trial is an on-device flag the paywall and settings read/write.
  subscriptionPlan: 'free' | 'trial';
  subscriptionBilling: 'monthly' | 'annual';
  trialStartedAt?: number;
  // Accessibility — read by cooking mode.
  largerText: boolean;   // bigger step text
  speakSteps: boolean;   // read each step aloud (text-to-speech)
  // Applied at startup (App.tsx flips the theme before screens load);
  // changing it needs a reload — web reloads itself, native asks the user.
  darkMode: boolean;
}

const DEFAULTS: AppSettings = {
  notificationsEnabled: false,
  notificationHour: 18,
  notificationMinute: 0,
  subscriptionPlan: 'free',
  subscriptionBilling: 'annual',
  largerText: false,
  speakSteps: false,
  darkMode: false,
};

export async function getSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(settings));
}
