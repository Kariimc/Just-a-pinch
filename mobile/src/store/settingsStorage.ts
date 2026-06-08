import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@jap_settings';

export interface AppSettings {
  notificationsEnabled: boolean;
  notificationHour: number;
  notificationMinute: number;
}

const DEFAULTS: AppSettings = {
  notificationsEnabled: false,
  notificationHour: 18,
  notificationMinute: 0,
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
