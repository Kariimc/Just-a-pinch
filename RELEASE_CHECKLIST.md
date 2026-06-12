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
- [ ] **Real payments / subscriptions.** The Paywall is a local fake — it writes
  `subscriptionPlan: 'trial'` to AsyncStorage and states "Payments aren't live
  during early access." "Restore purchases" only shows a toast. No StoreKit /
  Play Billing / RevenueCat. Decide: implement real IAP **or** launch free and
  hide the purchase UI.
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
- [ ] **AI usage metering & gating.** The paywall advertises "3/month free" and
  "unlimited premium," but there is no usage tracking anywhere (client or
  server). Every user can call the AI endpoints freely — uncapped Anthropic
  cost, and the feature doesn't match what's sold. Needs server-side per-user
  metering keyed to subscription status.

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

- [ ] **No crash/error reporting or analytics** anywhere — add Sentry or similar.
- [ ] Ensure "Coming Soon" surfaces (Community screen, Family plan note) are
  clearly gated so they don't read as broken.
- [ ] Test on real iOS + Android devices via a dev/preview build — Expo Go can't
  exercise Apple auth, IAP, or notifications.
- [ ] The `ErrorBoundary` in `App.tsx` shows a raw "Crash Diagnostic" stack
  trace to users — fine for beta, hide it in production builds.
- [ ] Verify the deep-link auth flow (email confirm + password reset) end-to-end
  on a standalone build.
- [ ] Bump `version` / `buildNumber` / `versionCode` for the release.

---

**Already in place** (not outstanding): app icons, splash, adaptive Android
icons, encryption-compliance flag (`ITSAppUsesNonExemptEncryption`), and the RLS
hardening migration.
