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
}

const DEFAULTS: AppSettings = {
  notificationsEnabled: false,
  notificationHour: 18,
  notificationMinute: 0,
  subscriptionPlan: 'free',
  subscriptionBilling: 'annual',
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
