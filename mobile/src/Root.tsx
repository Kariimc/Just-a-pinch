import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './navigation/AppNavigator';
import { ToastHost } from './components/Toast';
import { ActionSheetHost } from './components/ActionSheet';
import { BadgeUnlockHost } from './components/BadgeUnlock';
import { Colors } from './theme';

// Everything theme-dependent lives behind this module. App.tsx lazy-imports
// it only AFTER reading the dark-mode setting and (maybe) calling
// applyDarkTheme() — screens create their StyleSheets from Colors at import
// time, so the flip must happen before this module graph loads. Don't import
// Root (or anything under src/screens) statically from App.tsx.
export default function Root() {
  return (
    <>
      <StatusBar style={Colors.isDark ? 'light' : 'dark'} />
      <AppNavigator />
      <BadgeUnlockHost />
      <ActionSheetHost />
      <ToastHost />
    </>
  );
}
