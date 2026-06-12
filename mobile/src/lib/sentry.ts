// Crash + error reporting via Sentry — deliberately optional, mirroring how the
// Pexels/Instacart keys degrade gracefully. When no DSN is configured
// (extra.sentryDsn in app.json), every export here is a no-op, so the app runs
// exactly as before. The native package is required lazily inside try/catch so
// nothing breaks if `@sentry/react-native` isn't installed yet (run
// `npx expo install @sentry/react-native` to add the SDK-paired version).

import Constants from 'expo-constants';

const DSN = ((Constants.expoConfig?.extra?.sentryDsn as string | undefined) ?? '').trim();

let client: typeof import('@sentry/react-native') | null = null;

export function initSentry(): void {
  if (!DSN) return; // No DSN → stay a no-op (early access / open-source forks).
  try {
    const S = require('@sentry/react-native') as typeof import('@sentry/react-native');
    S.init({
      dsn: DSN,
      // Recipe titles, prompts, and ingredient text can be personal — never
      // attach request bodies or default PII to events.
      sendDefaultPii: false,
      // Sample a slice of performance traces in production; full noise in dev.
      tracesSampleRate: __DEV__ ? 0 : 0.2,
      environment: __DEV__ ? 'development' : 'production',
      // Dev errors already surface in the console + redbox; don't ship them.
      enabled: !__DEV__,
    });
    client = S;
  } catch {
    // Package missing or init threw — reporting just stays off.
    client = null;
  }
}

// Report a caught error without ever letting the reporter itself crash the app.
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (!client) return;
  try {
    client.captureException(error, context ? { extra: context } : undefined);
  } catch { /* swallow */ }
}

// Tie events to the signed-in user (id only — no email/PII). Pass null to clear
// on sign-out.
export function setSentryUser(id: string | null): void {
  if (!client) return;
  try {
    client.setUser(id ? { id } : null);
  } catch { /* swallow */ }
}
