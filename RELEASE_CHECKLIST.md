# Just a Pinch — Release Checklist

Everything still outstanding before shipping to the App Store / Google Play.
Grounded in the actual state of the code. Tick items as they're completed.

## 🔴 Blockers — store rejection or broken core flows

- [x] **In-app account deletion.** Built: Settings → Account → "Delete account"
  (`handleDeleteAccount`) → `deleteAccount()` in `store/storage.ts` calls the
  new `delete-account` edge function, which runs the service-role
  `auth.admin.deleteUser` (cascades to every table), then drops the session and
  clears all local `@jap_` data. **Still to do:** `supabase functions deploy
  delete-account` and set `verify_jwt = true` on it.
- [x] **Real payments / subscriptions.** Wired via RevenueCat (StoreKit + Play
  Billing). `lib/purchases.ts` handles configure/offers/purchase/restore; the
  Paywall shows live store prices, real Subscribe + Restore, an auto-renewal
  disclosure, and a manage state; the `revenuecat-webhook` edge function flips
  the authoritative `profiles.ai_unlimited` server-side. Pricing: **$4.99/mo,
  $39.99/yr** (entitlement `premium`). Native-module-safe — falls back to the
  early-access trial flag in Expo Go / web. **Still to do (full guide in
  `PAYMENTS_SETUP.md`):** create the store products + RevenueCat offering, add
  the API keys to `app.json` extra, deploy `revenuecat-webhook --no-verify-jwt`
  + set `REVENUECAT_WEBHOOK_AUTH`, test on an EAS build with sandbox accounts,
  then lower `FREE_MONTHLY_AI_LIMIT` 25 → 3.
- [ ] **Apple & Google sign-in (real OAuth).** Buttons + handlers are in place
  (`SocialAuthButtons`, `lib/socialAuth.ts`) but token acquisition is stubbed.
  Needs provider credentials, Supabase providers enabled, and a custom dev
  build. Offering Google on iOS forces Sign in with Apple too.
- [x] **Privacy Policy + Terms.** Documents written (`docs/privacy.html`,
  `docs/terms.html`) and tappable links wired in (SignUp checkbox + Settings →
  About), all reading from `mobile/src/lib/legal.ts`. **Still to do:** enable
  GitHub Pages (Settings → Pages → Source: `/docs`) so the URLs resolve, give
  the privacy URL to both stores, and have the drafted text reviewed (it's a
  solid starting template, not legal advice).
- [x] **AI usage metering & gating.** Built server-side: migration
  `20260615000000_ai_usage_metering` adds an `ai_usage` counter + a
  `profiles.ai_unlimited` premium flag + an atomic `consume_ai_credit()` RPC;
  `recipe-api` calls it (`gateAi`) before every Claude request (the free JSON-LD
  import path stays free), returning 402 `ai_limit` / 401 `auth_required`. The
  app surfaces a `RecipeApiError.code` and routes a quota hit to the Paywall.
  **Decisions to confirm:** (a) free cap is set to **25/mo** as an early-access
  abuse guard so the "on the house" trial isn't throttled — lower to 3 once real
  IAP gates premium (one constant, `FREE_MONTHLY_AI_LIMIT`); (b) AI capture now
  **requires an account** (anon can't be metered) — everything else still works
  signed-out. **Still to do:** apply the migration + redeploy `recipe-api`.

## 🟠 Backend / infrastructure

- [ ] **Set `ANTHROPIC_API_KEY`** in Supabase → Edge Functions → Secrets.
  Without it, all AI (import / generate / OCR / parse) returns 503. Confirm the
  Anthropic account has billing/credits — AI calls cost real money per token.
- [ ] **Deploy both edge functions** (`recipe-api`, `claude-proxy`) to the
  production Supabase project; confirm all 5 migrations are applied.
- [ ] **Decide the fate of `backend/server.js`.** `api.ts` says the app talks to
  Supabase edge functions directly ("no self-hosted backend"), so this Express
  server looks like dead/legacy code. Remove it or document why it stays.
- [ ] **Supabase Auth config:** add deep-link redirect URLs to the allowlist
  (`justapinch://auth-callback` + standalone scheme), enable Apple/Google
  providers, and set up production SMTP — the default Supabase mailer is
  rate-limited and not for production confirmation/reset emails.
- [ ] **RLS audit.** A security-hardening migration exists; run Supabase
  advisors and confirm every table (including `community_recipes`) is locked
  down.

## 🟡 Store submission setup

- [ ] `eas.json` → `submit.production` is empty. Add the App Store Connect app
  ID / Apple team (iOS) and Play service-account key (Android).
- [ ] Apple Developer Program ($99/yr) + App Store Connect record; Google Play
  Console ($25 one-time) + Play record.
- [ ] **Privacy disclosures:** App Store privacy labels and Play Data Safety
  form — declare auth data and that recipe prompts/images are sent to Anthropic.
- [ ] Store assets: screenshots, description, keywords, age rating, support +
  marketing URLs.
- [ ] **Push notification credentials** if shipping notifications
  (`expo-notifications` is configured) — APNs key / FCM.

## 🟢 QA / polish

- [x] **Crash/error reporting (Sentry).** Wired: `src/lib/sentry.ts` (optional,
  fail-open — no-op until a DSN is set, and lazily requires the native package
  so the app still runs if it isn't installed); `initSentry()` runs at the top
  of `App.tsx`; the `ErrorBoundary` reports via `componentDidCatch`; auth state
  tags events with the user id (no PII). **Still to do:** run
  `npx expo install @sentry/react-native` (confirms the SDK-56-paired version —
  the `~7.2.0` pin in `package.json` is a placeholder), create a Sentry project
  and put its DSN in `app.json` → `extra.sentryDsn`, and fill the plugin's
  `organization`/`project` (+ an auth token via env) for source-map upload. No
  product analytics added (intentionally — privacy-light).
- [ ] Ensure "Coming Soon" surfaces (Community screen, Family plan note) are
  clearly gated so they don't read as broken.
- [ ] Test on real iOS + Android devices via a dev/preview build — Expo Go can't
  exercise Apple auth, IAP, or notifications.
- [x] The `ErrorBoundary` in `App.tsx` no longer shows a raw stack trace in
  production — `__DEV__` builds keep the "Crash Diagnostic" view; release builds
  show a calm, branded "Something went wrong" fallback and report to Sentry.
- [ ] Verify the deep-link auth flow (email confirm + password reset) end-to-end
  on a standalone build.
- [ ] Bump `version` / `buildNumber` / `versionCode` for the release.

---

**Already in place** (not outstanding): app icons, splash, adaptive Android
icons, encryption-compliance flag (`ITSAppUsesNonExemptEncryption`), and the RLS
hardening migration.
