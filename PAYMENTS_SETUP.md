# Payments setup (RevenueCat + App Store / Play)

The in-app purchase code is fully wired in the app; it activates once the store
products, RevenueCat keys, and a custom dev build are in place. Until then the
Paywall gracefully falls back to the early-access "on the house" trial flag, so
nothing crashes in Expo Go or on web.

## Pricing

| Product id (store + RevenueCat) | Price | Notes |
| --- | --- | --- |
| `premium_monthly` | **$4.99 / month** | |
| `premium_annual`  | **$39.99 / year** | 33% off monthly · ~$3.33/mo · the default-selected plan |

Entitlement identifier (RevenueCat): **`premium`** — both products grant it.
Promo pricing later: create promo offers / introductory prices in the stores;
no app change needed.

## What the code already does

- `mobile/src/lib/purchases.ts` — RevenueCat wrapper (configure, fetch offers,
  purchase, restore, entitlement check). Native-module-safe: no-ops to
  `PurchasesNotConfigured` until the SDK + an API key are present.
- `mobile/src/screens/paywall/PaywallScreen.tsx` — shows live localized store
  prices when available, real Subscribe + Restore buttons, an auto-renewal
  disclosure with Terms/Privacy links, and a manage state for active subs.
- `mobile/src/context/AuthContext.tsx` — calls `configurePurchases()` on sign-in
  so the RevenueCat customer id == the Supabase user id.
- `supabase/functions/revenuecat-webhook/index.ts` — flips
  `profiles.ai_unlimited` (the server source of truth the AI cap reads) when a
  subscription starts/ends. **This is what actually unlocks unlimited AI.**

## Steps to go live

1. **Stores.** Enroll in the Apple Developer Program ($99/yr) and Google Play
   Console ($25 once). Create the app records.
2. **Create the products.**
   - App Store Connect → your app → Subscriptions → a subscription group with
     `premium_monthly` ($4.99/mo) and `premium_annual` ($39.99/yr).
   - Play Console → Monetize → Subscriptions → same two product ids.
3. **RevenueCat** (free tier covers you to $2.5k/mo).
   - Create a project; add the iOS app (App Store shared secret) and Android app
     (Play service-account JSON).
   - Create an entitlement `premium`; attach both products to it.
   - Create an Offering (the "current" one) with a Monthly and an Annual package
     pointing at the two products.
   - Copy the **public SDK API keys** (one per platform).
4. **App config.** Put the keys in `mobile/app.json` → `extra`:
   `revenueCatApiKeyIos`, `revenueCatApiKeyAndroid`.
5. **Webhook.** In RevenueCat → Integrations → Webhooks, set the URL to the
   deployed `revenuecat-webhook` function and an Authorization header value.
   Then:
   ```sh
   supabase functions deploy revenuecat-webhook --no-verify-jwt
   supabase secrets set REVENUECAT_WEBHOOK_AUTH=<that same Authorization value>
   ```
6. **Build.** `react-native-purchases` is native, so test on a custom dev/preview
   build (not Expo Go): `eas build --profile preview`. Use store sandbox
   accounts to test purchase + restore.
7. **Lower the free AI cap.** Once paid premium is verified, set
   `FREE_MONTHLY_AI_LIMIT` in `supabase/functions/recipe-api/index.ts` from `25`
   to the marketed `3`, and redeploy `recipe-api`. Paying users
   (`profiles.ai_unlimited`) stay unlimited.

## How unlocking works end to end

Purchase → RevenueCat validates the receipt → webhook sets
`profiles.ai_unlimited = true` → `recipe-api`'s `consume_ai_credit` RPC sees the
flag and stops counting that user against the cap. The app also flips local
`subscriptionPlan: 'premium'` immediately for snappy UI, but the server flag is
authoritative, so a tampered client can't grant itself unlimited AI.
