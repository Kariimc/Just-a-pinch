import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

function run(fn: () => Promise<void>) {
  if (Platform.OS === 'web') return;
  fn().catch(() => {});
}

export const hapticLight = () =>
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

export const hapticMedium = () =>
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

export const hapticStep = () =>
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid));

export const hapticSuccess = () =>
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
