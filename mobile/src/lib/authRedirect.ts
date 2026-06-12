import * as Linking from 'expo-linking';
import { supabase } from './supabase';

// The URL Supabase sends users back to after they tap an email link.
// - Standalone build: justapinch://auth-callback
// - Expo Go (dev):    exp://<lan-ip>:8081/--/auth-callback
// Whatever this resolves to MUST be added to the Supabase dashboard's
// Authentication → URL Configuration → Redirect URLs allowlist.
export const authRedirectUrl = Linking.createURL('auth-callback');

// Turns a tapped email link into a real session. Supabase appends either a
// `?code=` (PKCE — confirmation & recovery) or a `#error=` we surface. Returns
// the auth event type so callers can branch (e.g. route to "set new password").
export async function handleAuthLink(url: string): Promise<'signin' | 'recovery' | null> {
  const parsed = Linking.parse(url);
  const params = parsed.queryParams ?? {};

  if (typeof params.error_description === 'string') {
    throw new Error(params.error_description);
  }

  const code = typeof params.code === 'string' ? params.code : null;
  if (!code) return null;

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;

  // `type=recovery` distinguishes a password-reset link from a confirmation link
  return params.type === 'recovery' ? 'recovery' : 'signin';
}
