import { useEffect, useState, Component, lazy, Suspense, ReactNode } from 'react';
import { Platform, View, Text, ScrollView } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getSettings } from './src/store/settingsStorage';
import { applyDarkTheme } from './src/theme';
import { initSentry, captureError } from './src/lib/sentry';

import {
  Newsreader_400Regular,
  Newsreader_400Regular_Italic,
  Newsreader_500Medium,
  Newsreader_500Medium_Italic,
  Newsreader_600SemiBold,
} from '@expo-google-fonts/newsreader';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk';

SplashScreen.preventAutoHideAsync();

// Screens snapshot Colors into their StyleSheets when their modules load, so
// the dark-theme flip has to land first. Root is lazy-imported and only
// rendered once the setting has been read (see src/Root.tsx).
const Root = lazy(() => import('./src/Root'));

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    // Ship the crash to Sentry (no-op until a DSN is configured).
    captureError(error, { componentStack: info?.componentStack ?? undefined });
  }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      // In production, never show users a raw stack trace — give a calm,
      // recoverable message. The full diagnostic only renders in dev builds.
      if (!__DEV__) {
        return (
          <View style={{ flex: 1, backgroundColor: '#14542C', padding: 28, paddingTop: 80, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 12, textAlign: 'center' }}>
              Something went wrong
            </Text>
            <Text style={{ color: '#E4F2E8', fontSize: 15, lineHeight: 22, textAlign: 'center' }}>
              The app hit an unexpected error. Please close and reopen Just a Pinch — your recipes are safe.
            </Text>
          </View>
        );
      }
      return (
        <View style={{ flex: 1, backgroundColor: '#1a1a1a', padding: 20, paddingTop: 60 }}>
          <Text style={{ color: '#ff6b6b', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Crash Diagnostic
          </Text>
          <ScrollView>
            <Text style={{ color: '#fff', fontSize: 13, marginBottom: 8 }}>{err.message}</Text>
            <Text style={{ color: '#aaa', fontSize: 11 }}>{err.stack}</Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [themeReady, setThemeReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
    Newsreader_500Medium,
    Newsreader_500Medium_Italic,
    Newsreader_600SemiBold,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
  });

  useEffect(() => {
    getSettings()
      .then(s => { if (s.darkMode) applyDarkTheme(); })
      .finally(() => setThemeReady(true));
  }, []);

  useEffect(() => {
    if (themeReady && (fontsLoaded || fontError)) {
      SplashScreen.hideAsync();
    }
  }, [themeReady, fontsLoaded, fontError]);

  // Crash reporting starts AFTER the first render so its heavy SDK loads as a
  // lazy chunk and never blocks first paint / time-to-interactive. The
  // ErrorBoundary still catches anything thrown before it finishes loading.
  useEffect(() => { void initSentry(); }, []);

  // Brand-green holding screen for every pre-render gap (theme read, font load,
  // and the lazy Root chunk download on web). It matches the in-app SplashScreen
  // background exactly, so the very first paint is the splash colour instead of a
  // white flash — no "static screen" before the splash. Colour is hardcoded (not
  // a theme import) because this renders before the dark-theme flip is applied.
  if (!themeReady) return <BootSplash />;
  if (!fontsLoaded && !fontError && Platform.OS !== 'web') return <BootSplash />;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Suspense fallback={<BootSplash />}>
            <Root />
          </Suspense>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

function BootSplash() {
  return <View style={{ flex: 1, backgroundColor: '#2E9E57' }} />;
}
