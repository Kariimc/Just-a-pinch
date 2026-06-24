import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { handleAuthLink } from '../lib/authRedirect';
import { showToast } from '../components/Toast';
import { resetToMain } from '../navigation/navigationRef';
import { setSentryUser } from '../lib/sentry';
import { configurePurchases } from '../lib/purchases';
import { getSettings, saveSettings } from '../store/settingsStorage';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  // True while the user is in a password-recovery session (tapped a reset
  // link) and must choose a new password before doing anything else.
  recovering: boolean;
  clearRecovery: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  recovering: false,
  clearRecovery: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSentryUser(session?.user?.id ?? null);
      // Bind the RevenueCat customer to this user (no-op until IAP is built).
      configurePurchases();
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setSentryUser(session?.user?.id ?? null);
      if (event === 'SIGNED_IN') configurePurchases();
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Web: when Stripe redirects back with ?payment_status=success, mark the
  // local plan as premium and show a confirmation toast. The stripe-webhook
  // edge function has already (or will shortly) flip profiles.ai_unlimited.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment_status') !== 'success') return;
    window.history.replaceState({}, '', window.location.pathname);
    getSettings().then(async s => {
      await saveSettings({ ...s, subscriptionPlan: 'premium' });
      showToast('Welcome to Premium!', 'sparkle');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Exchange auth codes from email links (confirmation + password reset),
  // whether the app was cold-started by the link or already open.
  useEffect(() => {
    async function process(url: string | null) {
      if (!url || !url.includes('auth-callback')) return;
      try {
        const result = await handleAuthLink(url);
        if (result === 'recovery') setRecovering(true);
        else if (result === 'signin') resetToMain();
      } catch (e: any) {
        showToast(e?.message ?? 'That link is no longer valid. Request a new one.', 'info');
      }
    }
    Linking.getInitialURL().then(process);
    const sub = Linking.addEventListener('url', ({ url }) => process(url));
    return () => sub.remove();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setRecovering(false);
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        recovering,
        clearRecovery: () => setRecovering(false),
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
