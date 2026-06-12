import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '../types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Jump straight into the app once a deep-link sign-in establishes a session,
// even if the app was already open on an auth screen.
export function resetToMain() {
  if (navigationRef.isReady()) {
    navigationRef.reset({ index: 0, routes: [{ name: 'Main' }] });
  }
}
