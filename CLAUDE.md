# Just a Pinch — Session Handoff

A recipe organizer for iOS/Android: save recipes from a link, photo, pasted
text, or manual entry; organize and search them; cook hands-free. Meal plan,
shopping list, and AI generation exist as supporting features — the product
framing is "recipe organizer," not a do-everything cooking platform.

## Layout & stack

- `mobile/` — Expo SDK 56, React Native 0.85.3, React 19.2 (SDK-paired — never pin RN independently; check expo/template.tgz), TypeScript,
  React Navigation 7. Plain StyleSheet styling with theme tokens from
  `mobile/src/theme/index.ts` (Colors/Fonts/Radius/Spacing/Shadow — always
  use these, never raw hex/fontWeight). Motion uses Reanimated 4 with tokens
  from `mobile/src/theme/motion.ts` (Springs/Durations/Curves) and the
  `Tappable`/`AnimatedCheck` primitives — don't hand-roll spring params.
- `backend/` — Express server, now superseded: the four capture endpoints
  (URL import, photo OCR, text parsing, AI generation) live in the
  `recipe-api` Supabase edge function and the app calls them via
  `supabase.functions.invoke` (see `mobile/src/services/api.ts`). The Express
  code is kept for reference/local tinkering only — nothing points at it.
- `supabase/` — migrations + `claude-proxy` edge function source.
- `SPECIFICATION.md` — full screen-by-screen feature spec (reference only).

## Data flow

`mobile/src/store/storage.ts` is the only data API screens use. It dual-writes:
Supabase (`mobile/src/lib/db.ts`) when signed in, AsyncStorage always — so the
app works offline and signed-out. Auth is Supabase email/password only
(OAuth buttons were removed deliberately — dead social buttons are an App
Store rejection risk). Email confirmation + password reset use PKCE deep
links: redirect is `Linking.createURL('auth-callback')`, handled in
`AuthContext` via `src/lib/authRedirect.ts`. The redirect URL must be in the
Supabase dashboard's Auth → URL Configuration allowlist (app scheme is
`justapinch://`).

## Live infrastructure (already done — don't redo)

- Supabase project `qdlfiewspjgbucszezja` (us-east-2). All migrations in
  `supabase/migrations/` are applied, including the 2026-06-11 hardening one
  (dropped leftover open tables, locked RLS, added indexes). Security
  advisors report zero findings.
- `claude-proxy` edge function is deployed at v5 with `verify_jwt: true` and
  vision support (photo OCR sends a base64 image block).
- `recipe-api` edge function (source in `supabase/functions/recipe-api/`)
  deployed at v8 with `verify_jwt: true` — the app's anon key satisfies the
  JWT check, so capture works signed-out too. This replaced the LAN-IP
  Express backend (Android blocked it as CLEARTEXT; see 2026-06-12 device QA).
  Also hosts `instacartLink` (shopping list → Instacart cart page via the
  Instacart Developer Platform API). v8 adds Pexels stock-photo lookup:
  recipes with no image of their own (AI-generated, pasted, scanned, or a URL
  with no og:image) get a real food photo keyed off the dish name via
  `fetchFoodPhoto` — graceful no-op to the gradient placeholder when
  `PEXELS_API_KEY` is unset.
- **BLOCKER (2026-06-12): no `ANTHROPIC_API_KEY` secret is set on the
  project** — confirmed via edge-function logs (v2's missing-key guard
  503s in ~70ms). Every AI capture path fails until the user adds it in
  Supabase → Edge Functions → Secrets. claude-proxy reads the same name and
  has therefore never worked either. `INSTACART_API_KEY` is likewise unset
  (Instacart button falls back to a search URL until it's added;
  `INSTACART_ENV=development` switches to the sandbox host for dev keys).
  `PEXELS_API_KEY` (free, pexels.com/api) is optional — when unset, captured
  recipes without their own photo just show the gradient placeholder; when
  set, they get a real food photo. No balance/billing needed.
- A leftover `recipe-scraper` edge function (verify_jwt: false, old data
  shape from the deleted app revision) is still deployed but unused —
  candidate for deletion next infra pass.
- `featured_recipes` seeding must use the **service role** key; the open
  insert policy was removed.

## State as of 2026-06-11

All screens are functional with real data: full audit + feature completion +
visual polish pass is done (see commits `d858aa3`, `e928ad8` on
`claude/optimistic-euler-n19zpu`). Splash is static brand logo; app icons are
real (generated from `mobile/assets/logo*.png` — sources are only ~300px, so
regenerate if higher-res exports appear). Release config done: bundle IDs
`com.justapinch.app`, permission strings, EAS production profile.

Badge system (2026-06-11): 12 achievement badges. Defs + progress live in
`mobile/src/store/badges.ts` — most stats derive live from recipe/meal-plan
data; shopping check-offs and AI saves use local cumulative counters
(`bumpBadgeStat`, called from ShoppingScreen/AIGeneratorScreen). Earned state
is local-only AsyncStorage (no Supabase table), once-earned-always-earned.
UI: `BadgeMedallion` (layered SVG + sheen/twinkle FX driven by the `Ambient`
motion tokens), `BadgesScreen` (hero showcase + grid + detail overlay with
how-to-earn copy), entry row in the Settings Account card. Metal palettes are
`BadgeMetals` in the theme; don't add badge goals that aren't earnable via
real UI actions (there is no rating or collection-creation UI, for example).

## Verify before claiming anything works

```sh
cd mobile && npx tsc --noEmit                # must be clean
cd mobile && npx expo export --platform android   # must bundle
node --check backend/server.js
```

No simulator in cloud sessions — flag device-level claims as unverified.

## 2026-06-12 device QA round

First hardware walkthrough surfaced: CLEARTEXT failures on all capture paths
(fixed — `recipe-api` edge function over HTTPS), blank greeting/avatar when
the profile row was missing (fixed — `healProfile` in storage.ts synthesizes
from the auth user), sign-up copy/alignment nits, short splash (now 1800ms).
Added in the same round: onboarding slide illustrations (`OnboardingArt`),
paywall + subscription screens (local-only trial flag in settingsStorage —
no payment processor; wire RevenueCat/IAP before charging real money),
extra home quick filters, animated tab bar (`TabGlyph`/`PlusButton`),
AI banner sheen + sparkle pulse, ambient home backdrop.

## Open items (next session picks up here)

1. Re-run the device walkthrough now that capture goes through `recipe-api`:
   AI generate → URL import → photo scan → cook mode → plan → shopping list.
   (The edge function couldn't be invoked from the cloud sandbox — network
   egress blocked supabase.co — so on-device is the verification.)
2. Sentry/crash reporting — intentionally not wired; needs a DSN decision.
3. Store assets beyond icons (screenshots, listing copy) not started.
4. Real IAP (StoreKit/Play Billing or RevenueCat) behind the paywall before
   charging; the current trial is a local flag only.
5. Delete the leftover `recipe-scraper` edge function once confirmed unused.
