# Paywall / In-App Purchase Setup

Status of wiring RevenueCat (StoreKit + Play Billing) behind the paywall.
The **code is complete** — everything below is external dashboard setup.

App identifiers: bundle ID / package `com.justapinch.app`
Supabase project: `qdlfiewspjgbucszezja`
RevenueCat project: `Just A Pinch` (project id `projadf9ee76`)

---

## ✅ Done

- [x] RevenueCat account + project created
- [x] Entitlement named exactly `premium`
- [x] Products `premium_monthly` ($4.99/mo) + `premium_annual` ($39.99/yr)
- [x] Default offering with both packages, attached to `premium`
- [x] Play Store app added in RevenueCat (`com.justapinch.app`)
- [x] Google Cloud project `just-a-pinch` created
- [x] Service account `revenuecat@just-a-pinch.iam.gserviceaccount.com` created,
      JSON key uploaded to RevenueCat, added as Admin user in Play Console
- [x] Enabled in Google Cloud: Pub/Sub API + Google Play Android Developer API
- [x] **Android API key wired into `mobile/app.json`** (`revenueCatApiKeyAndroid`)

---

## ⚠️ BRANCH DIVERGENCE — read first (decision pending)

Builds (EAS / GitHub Actions) come from **`main`**, but `main` has
`revenueCatApiKeyAndroid: ""` (empty) — so any build from `main` CANNOT do
Android purchases yet. This session's work (the key + dead-code cleanup +
community feature) lives on **`claude/cool-mccarthy-okwf7q`**, which diverged
from `main` at `bdf09ea`.

The two branches independently built overlapping things (Sentry, privacy page,
the paywall code), so they are NOT clean supersets of each other:

| | `main` (build source) | `claude/cool-mccarthy-okwf7q` |
|---|---|---|
| RevenueCat Android key | empty | set |
| Dead-code cleanup | no | yes |
| Community feature | missing | present |
| GitHub Actions build workflow (#30) | yes | no |
| Sentry Gradle 8 build fix (#31) | yes | no |

**To get a key-enabled Android build, the key must land on `main`.** Two paths:
- **Minimal:** branch off `main`, add just the one-line key, PR → merge. Fast,
  no conflicts. (Decided to defer for now.)
- **Full reconcile:** merge the session branch into `main` — conflict-heavy
  (both sides built Sentry/privacy/paywall separately); needs careful review.

Status: **deferred** — revisit before the next Android build.

---

## ⏳ Resolving on its own (no action needed)

- [ ] RevenueCat "Credentials need attention" on the Play Store app.
      Google can take **up to 24h** to propagate service-account permissions.
      Check tomorrow — it should be green. If it's still red after 24h, re-check
      that the service account has access in Play Console → Users & permissions.

---

## 📋 Webhook (server-side entitlement sync) — do anytime

Keeps `profiles.ai_unlimited` in sync so paying users get unlimited AI captures.
Function source already in repo: `supabase/functions/revenuecat-webhook/index.ts`.

The shared secret value was generated and given in chat — **keep it in your
password manager.** Referenced below as `<WEBHOOK_AUTH_SECRET>`. The SAME value
goes in both Step 1 and Step 3.

- [ ] **Step 1 — Supabase secret.** Dashboard → Edge Functions → Secrets:
      add `REVENUECAT_WEBHOOK_AUTH` = `<WEBHOOK_AUTH_SECRET>`
- [ ] **Step 2 — Deploy the function.** Either:
      - Dashboard → Edge Functions → create `revenuecat-webhook`, paste the code,
        set **Verify JWT = OFF** (critical — RevenueCat sends no Supabase JWT), or
      - From a computer with the repo: `supabase functions deploy revenuecat-webhook --no-verify-jwt`
- [ ] **Step 3 — RevenueCat webhook.** Dashboard → Project Settings →
      Integrations → Webhooks → Add:
      - URL: `https://qdlfiewspjgbucszezja.supabase.co/functions/v1/revenuecat-webhook`
      - Authorization header value: `<WEBHOOK_AUTH_SECRET>`

---

## 🍎 Apple / iOS — tomorrow

- [ ] **App Store Connect** → your app → In-App Purchases → create two
      auto-renewable subscriptions in one subscription group:
      - `premium_monthly` — $4.99/month
      - `premium_annual` — $39.99/year
- [ ] **RevenueCat** → add the iOS app (bundle `com.justapinch.app`),
      upload the App Store Connect API key, add both products to the offering
- [ ] **Get the iOS API key** (`appl_...`) from RevenueCat → API Keys, then add it
      to `mobile/app.json` under `extra.revenueCatApiKeyIos`
      (Claude can do this last edit — just paste the key in chat)

---

## 🧪 Final — test a real purchase

- [ ] Make a **custom dev/production build** (not Expo Go — `react-native-purchases`
      is a native module that no-ops in Expo Go / web):
      `cd mobile && eas build --profile production` (or a dev build)
- [ ] Install on a real device, open the paywall, run a sandbox purchase
- [ ] Confirm: entitlement activates in the app AND `profiles.ai_unlimited`
      flips to `true` (verifies the webhook end-to-end)

---

## Notes

- RevenueCat public SDK keys (`goog_...` / `appl_...`) are client keys, safe to
  commit (like the Supabase anon key). The service-account JSON and the webhook
  secret are NOT — never commit those.
- The paywall already falls back gracefully ("on the house" local trial) on any
  build where the native module or API key is missing, so nothing crashes
  pre-build.
