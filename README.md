# Just a Pinch

A recipe app for iOS and Android. Save recipes from anywhere — a link, a photo
of a handwritten card, pasted text, or an AI prompt — then cook them hands-free,
plan your week, and generate a shopping list in one tap.

## Architecture

| Piece | Tech | Where |
|---|---|---|
| Mobile app | Expo SDK 56 · React Native · TypeScript | `mobile/` |
| Import/AI backend | Node + Express (URL scraping, OCR, AI generation) | `backend/` |
| Database, auth, storage | Supabase (Postgres + RLS, email auth, image bucket) | `supabase/` |
| AI | Claude via the `claude-proxy` edge function (the API key never leaves Supabase) | `supabase/functions/claude-proxy/` |

Recipes sync to Supabase when signed in and always mirror to AsyncStorage, so
the app works offline and for signed-out users.

## Getting started

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL in `supabase/migrations/` (in filename order) via the SQL editor,
   or `supabase db push` with the CLI.
3. Create the public `recipe-images` storage bucket (SQL for its policies is
   commented at the bottom of the initial migration).
4. Deploy the edge function and give it your Anthropic key:
   ```sh
   supabase functions deploy claude-proxy
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   ```

### 2. Backend

```sh
cd backend
cp .env.example .env   # fill in your Supabase URL + anon key
npm install
node server.js         # serves on http://0.0.0.0:3001
```

### 3. Mobile app

```sh
cd mobile
npm install
npx expo start
```

In `mobile/app.json`, set `extra.apiUrl` to your machine's LAN IP (e.g.
`http://192.168.1.42:3001`) so a physical device can reach the backend, and
`extra.supabaseUrl` / `extra.supabaseAnonKey` to your project's values. The
anon key is publishable — row security is enforced by RLS policies.

### Checks

```sh
cd mobile
npx tsc --noEmit                      # typecheck
npx expo export --platform android    # verify the bundle builds
```

## Release builds (EAS)

```sh
cd mobile
npx eas build --profile preview --platform android   # internal APK
npx eas build --profile production --platform all    # store builds (auto-increments versions)
npx eas submit --platform ios                        # after a production build
```

Store metadata lives in `mobile/app.json`: bundle IDs (`com.justapinch.app`),
splash screen, icons, and the iOS/Android permission strings for camera and
photo library.

## Production notes

- The backend is the only caller of `claude-proxy`; the function requires a
  valid Supabase JWT, which `supabase-js` sends automatically. Any seeding
  scripts that insert into `featured_recipes` must use the **service role**
  key (the open insert policy was removed in the hardening migration).
- For a public release, host the backend somewhere reachable (Railway, Fly,
  Render…) and point `extra.apiUrl` at it over HTTPS.
- Crash reporting (e.g. Sentry) is not wired up yet — add a DSN and the
  `@sentry/react-native` config plugin before a wide rollout if you want it.
