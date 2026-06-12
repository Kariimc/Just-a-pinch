import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { handleAuthLink } from '../lib/authRedirect';
import { showToast } from '../components/Toast';
import { resetToMain } from '../navigation/navigationRef';

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
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
    });

    return () => subscription.unsubscribe();
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
