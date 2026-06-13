import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@jap_settings';

export interface AppSettings {
  notificationsEnabled: boolean;
  notificationHour: number;
  notificationMinute: number;
  // Subscription state. 'premium' = a real RevenueCat entitlement is active
  // (server profiles.ai_unlimited is the source of truth; this mirrors it for
  // instant UI). 'trial' = the early-access "on the house" local flag used
  // before IAP is live. 'free' = neither.
  subscriptionPlan: 'free' | 'trial' | 'premium';
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

// True when the user should get premium treatment — a paid entitlement or the
// early-access trial. Use this to gate premium UI rather than checking the
// plan string directly.
export function isPremium(settings: Pick<AppSettings, 'subscriptionPlan'>): boolean {
  return settings.subscriptionPlan === 'premium' || settings.subscriptionPlan === 'trial';
}
