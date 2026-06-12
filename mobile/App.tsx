import { useEffect, useState, Component, lazy, Suspense, ReactNode } from 'react';
import { Platform, View, Text, ScrollView } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getSettings } from './src/store/settingsStorage';
import { applyDarkTheme } from './src/theme';

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
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
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

  if (!themeReady) return null;
  if (!fontsLoaded && !fontError && Platform.OS !== 'web') return null;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Suspense fallback={null}>
            <Root />
          </Suspense>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
