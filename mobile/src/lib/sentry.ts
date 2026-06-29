// Crash + error reporting via Sentry — deliberately optional, mirroring how the
// Pexels/Instacart keys degrade gracefully. When no DSN is configured
// (extra.sentryDsn in app.json), every export here is a no-op, so the app runs
// exactly as before. The native package is required lazily inside try/catch so
// nothing breaks if `@sentry/react-native` isn't installed yet (run
// `npx expo install @sentry/react-native` to add the SDK-paired version).

import Constants from 'expo-constants';

const DSN = ((Constants.expoConfig?.extra?.sentryDsn as string | undefined) ?? '').trim();

let client: typeof import('@sentry/react-native') | null = null;
// A user id set before the SDK finished loading — applied once it's ready.
let pendingUserId: string | null = null;
let pendingUserSet = false;

// Loaded LAZILY via dynamic import() so the heavy Sentry SDK lands in its own
// async chunk instead of the initial bundle — it no longer blocks first paint /
// time-to-interactive. Call after the app has rendered (see App.tsx). Errors
// thrown before it resolves are still caught by the ErrorBoundary; we just
// can't forward those very first ones, an acceptable trade for a faster start.
export async function initSentry(): Promise<void> {
  if (!DSN || client) return; // No DSN, or already initialised → nothing to do.
  try {
    const S = (await import('@sentry/react-native')) as typeof import('@sentry/react-native');
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
    // Flush a user id that was set while the SDK was still loading.
    if (pendingUserSet) {
      try { S.setUser(pendingUserId ? { id: pendingUserId } : null); } catch { /* swallow */ }
      pendingUserSet = false;
    }
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
  if (!client) {
    // SDK not loaded yet — remember it and apply on init.
    pendingUserId = id;
    pendingUserSet = true;
    return;
  }
  try {
    client.setUser(id ? { id } : null);
  } catch { /* swallow */ }
}
