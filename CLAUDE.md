# Just a Pinch — Agent Handoff

## What this project is
A warm, editorial recipe app for iOS, Android, and web. Stack: Expo ~54 managed workflow, React Navigation 7, Supabase (auth + storage), TypeScript. The design is locked — do not redesign, restyle, or add features outside of what's requested.

## Current state (as of June 2026)
All work is on `main`. The app is fully built and deploying to GitHub Pages.

- **Live web preview**: https://kariimc.github.io/Just-a-pinch/
- **Repo**: https://github.com/Kariimc/Just-a-pinch
- **Development branch convention**: create feature branches off `main`, open a PR, merge when ready

## Project structure
```
mobile/                   ← Expo app (all source code lives here)
  App.tsx                 ← Entry point; loads fonts, hides splash
  app.json                ← Expo config; experiments.baseUrl = "/Just-a-pinch"
  src/
    components/           ← Shared UI components
      Icon.tsx            ← Custom SVG icon set (50+ icons, react-native-svg)
      Button.tsx          ← Primary button; supports leadingIcon prop
      Chip.tsx            ← Filter chip
      RecipeCard.tsx      ← Card with grid / horizontal / small variants
      BottomSheet.tsx     ← Modal bottom sheet
      FoodPlaceholder.tsx ← Colored gradient placeholder for recipe images
    screens/
      auth/               ← SplashScreen, WelcomeScreen, LoginScreen, SignUpScreen, PersonalizationQuizScreen
      home/               ← HomeScreen
      recipe/             ← RecipeDetailScreen, CookingModeScreen
      capture/            ← AddMenuScreen, RecipeEditorScreen, AIGeneratorScreen
      library/            ← LibraryScreen
      plan/               ← MealPlanScreen
      shopping/           ← ShoppingScreen
      SearchScreen.tsx
    navigation/
      AppNavigator.tsx    ← Stack + tab navigator; wraps AuthProvider
    context/
      AuthContext.tsx     ← Supabase auth session; useAuth() hook
    lib/
      supabase.ts         ← Supabase client (reads URL/key from app.json extra)
      db.ts               ← DB helpers (uploadRecipeImage, etc.)
    store/
      storage.ts          ← AsyncStorage wrappers (getRecipes, saveRecipe, etc.)
    theme/
      index.ts            ← Design tokens: Colors, Fonts, Radius, Spacing, Shadow
    types/
      index.ts            ← RootStackParamList, Recipe, Ingredient, Step types
    utils/
      id.ts               ← uid() helper
.github/workflows/
  deploy-pages.yml        ← Builds Expo web export and deploys to GitHub Pages on push to main
  build-android.yml       ← EAS build for Android APK
```

## Design tokens (never override these)
```typescript
// theme/index.ts
Colors.paper      = '#FAF6EF'   // background
Colors.surface    = '#FFFFFF'
Colors.surface2   = '#F4EEE4'
Colors.ink        = '#211C16'   // primary text
Colors.ink2       = '#6A6157'
Colors.ink3       = '#9C9387'   // muted text
Colors.line       = '#ECE4D7'
Colors.accent     = '#2E9E57'   // herb green
Colors.accentDeep = '#1E7A41'
Colors.accentSoft = '#E4F2E8'
Colors.accentInk  = '#14542C'

Fonts.displayRegular       = 'Newsreader_400Regular'
Fonts.displayRegularItalic = 'Newsreader_400Regular_Italic'
Fonts.displayMedium        = 'Newsreader_500Medium'
Fonts.displayMediumItalic  = 'Newsreader_500Medium_Italic'
Fonts.displaySemiBold      = 'Newsreader_600SemiBold'
Fonts.uiRegular            = 'HankenGrotesk_400Regular'
Fonts.uiMedium             = 'HankenGrotesk_500Medium'
Fonts.uiSemiBold           = 'HankenGrotesk_600SemiBold'
Fonts.uiBold               = 'HankenGrotesk_700Bold'

Radius.xs = 8 | sm = 12 | md = 16 | lg = 22 | xl = 30 | pill = 999
```

## Key rules
- Always use `StyleSheet.absoluteFillObject` (not `StyleSheet.absoluteFill`) to avoid TS spread errors
- Icons come from `Icon.tsx` — do not add image files or emoji for icons
- All font usage must go through `Fonts.*` tokens — no hardcoded font family strings
- All color usage must go through `Colors.*` tokens — no hardcoded hex values
- Run `npx tsc --noEmit` from `mobile/` before committing to catch type errors

## Supabase
- URL + anon key are hardcoded in `app.json` under `extra.supabaseUrl` / `extra.supabaseAnonKey`
- The CI workflow also injects `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` from GitHub secrets — but the app currently reads from `Constants.expoConfig.extra`, not `process.env`
- Supabase project: `qdlfiewspjgbucszezja.supabase.co`

## GitHub Pages deployment
- Workflow: `.github/workflows/deploy-pages.yml`
- Triggers on push to `main` when files in `mobile/**` change
- Requires GitHub repo Settings → Pages → Source = "GitHub Actions"
- The `experiments.baseUrl: "/Just-a-pinch"` in `app.json` is critical — without it the JS bundle 404s

## Running locally
```bash
cd mobile
npm install --legacy-peer-deps
npx expo start          # native (iOS/Android via Expo Go)
npx expo start --web    # web dev server
npx expo export --platform web --output-dir ../dist   # production web build
```

## Git workflow
- Small tweaks: commit directly to `main`
- New features / screens: branch off `main` → PR → merge
- After merging to `main`, GitHub Actions auto-deploys to Pages within ~2 min
- The user will confirm when to commit or open a PR — do not push without being asked
