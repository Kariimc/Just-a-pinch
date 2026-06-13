import { supabase } from './supabase';

export type SocialProvider = 'apple' | 'google';

// Raised when a social provider hasn't been configured yet (missing OAuth
// credentials / native module). Screens catch this to show a friendly notice
// instead of a red crash.
export class SocialAuthNotConfigured extends Error {
  constructor(public provider: SocialProvider) {
    super(
      `${provider === 'apple' ? 'Apple' : 'Google'} sign-in isn't set up yet. ` +
        'Add the provider in Supabase and a custom dev build to enable it.',
    );
    this.name = 'SocialAuthNotConfigured';
  }
}

// The final, real step shared by every social flow: trade the provider's
// id_token for a Supabase session. This is fully wired — the only missing piece
// is obtaining `idToken` in the provider stubs below.
export async function completeSignIn(provider: SocialProvider, idToken: string, nonce?: string) {
  const { error } = await supabase.auth.signInWithIdToken({ provider, token: idToken, nonce });
  if (error) throw error;
}

// To enable: `npx expo install expo-apple-authentication`, turn on Apple under
// Supabase → Authentication → Providers, then in a custom dev build:
//   const rawNonce = randomNonce();
//   const cred = await AppleAuthentication.signInAsync({
//     requestedScopes: [FULL_NAME, EMAIL],
//     nonce: await sha256(rawNonce),
//   });
//   await completeSignIn('apple', cred.identityToken!, rawNonce);
// Sign in with Apple does NOT run in Expo Go or on Android.
export async function signInWithApple(): Promise<void> {
  throw new SocialAuthNotConfigured('apple');
}

// To enable: `npx expo install expo-auth-session expo-web-browser`, turn on
// Google under Supabase → Authentication → Providers, add the iOS/Web client
// IDs to app.json `extra`, then run the AuthSession flow for an id_token:
//   await completeSignIn('google', idToken);
export async function signInWithGoogle(): Promise<void> {
  throw new SocialAuthNotConfigured('google');
}
