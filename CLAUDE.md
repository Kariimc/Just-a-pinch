# Just a Pinch — Agent Handoff

## What this project is
A warm, editorial recipe app for iOS, Android, and web. Stack: Expo ~54 managed workflow, React Navigation 7, Supabase (auth + storage), TypeScript.

- **Live web preview**: https://kariimc.github.io/Just-a-pinch/
- **Repo**: https://github.com/Kariimc/Just-a-pinch
- **Stable branch**: `main` — this is the source of truth. All feature work branches off here.

---

## THE DESIGN IS LOCKED

Do not redesign, restyle, reorder, or "improve" any existing screen. Do not change spacing, font sizes, colors, border radii, or component layouts unless the user explicitly requests it and describes the exact change. The visual design was built from a locked design handoff and must be reproduced exactly.

**Permitted**: adding new screens, new data, new logic, new navigation routes, wiring up real Supabase data to existing UI placeholders.

**Not permitted**: changing the look of anything that already exists unless directly instructed.

---

## Git workflow

- **All new features** → branch off `main`, name it `feature/short-description`
- **Small fixes** (typo, crash, one-line tweak) → commit directly to `main`
- **Never push to `main` without the user confirming** — always say "ready to commit" or "ready to open a PR" and wait
- After a PR merges to `main`, GitHub Actions auto-deploys to Pages within ~2 min

---

## Project structure
```
mobile/                   ← Expo app root
  App.tsx                 ← Loads fonts, hides splash, renders AppNavigator
  app.json                ← experiments.baseUrl = "/Just-a-pinch" (critical for Pages)
  src/
    components/
      Icon.tsx            ← 50+ custom SVG icons (react-native-svg). Add icons here only.
      Button.tsx          ← Primary button; variant: "primary" | "outline" | "ghost"; leadingIcon prop
      Chip.tsx            ← Filter chip
      RecipeCard.tsx      ← variant: "grid" | "horizontal" | "small"
      BottomSheet.tsx     ← Modal slide-up sheet
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
      AppNavigator.tsx    ← Stack + Tab navigator; wraps AuthProvider
    context/
      AuthContext.tsx     ← Supabase session; useAuth() hook
    lib/
      supabase.ts         ← Supabase client (reads from app.json extra)
      db.ts               ← DB helpers (uploadRecipeImage, etc.)
    store/
      storage.ts          ← AsyncStorage wrappers (getRecipes, saveRecipe, getProfile, etc.)
    theme/
      index.ts            ← ALL design tokens live here. Never hardcode values.
    types/
      index.ts            ← RootStackParamList, Recipe, Ingredient, Step
    utils/
      id.ts               ← uid() helper
.github/workflows/
  deploy-pages.yml        ← Triggers on push to main when mobile/** changes
  build-android.yml       ← EAS Android APK build
```

---

## Design tokens — never override, never hardcode

```typescript
Colors.paper      = '#FAF6EF'   // page background
Colors.surface    = '#FFFFFF'
Colors.surface2   = '#F4EEE4'
Colors.ink        = '#211C16'   // primary text
Colors.ink2       = '#6A6157'
Colors.ink3       = '#9C9387'   // muted/placeholder
Colors.line       = '#ECE4D7'
Colors.line2      = '#E0D6C6'
Colors.accent     = '#2E9E57'   // herb green
Colors.accentDeep = '#1E7A41'
Colors.accentSoft = '#E4F2E8'
Colors.accentInk  = '#14542C'
Colors.error      = '#C0392B'

Fonts.displayRegular       = 'Newsreader_400Regular'
Fonts.displayRegularItalic = 'Newsreader_400Regular_Italic'
Fonts.displayMedium        = 'Newsreader_500Medium'
Fonts.displayMediumItalic  = 'Newsreader_500Medium_Italic'
Fonts.displaySemiBold      = 'Newsreader_600SemiBold'
Fonts.uiRegular            = 'HankenGrotesk_400Regular'
Fonts.uiMedium             = 'HankenGrotesk_500Medium'
Fonts.uiSemiBold           = 'HankenGrotesk_600SemiBold'
Fonts.uiBold               = 'HankenGrotesk_700Bold'

Radius.xs = 8 | .sm = 12 | .md = 16 | .lg = 22 | .xl = 30 | .pill = 999
```

---

## Rules every agent must follow

1. **`StyleSheet.absoluteFillObject`** — never `StyleSheet.absoluteFill` (causes TS spread error)
2. **Icons from `Icon.tsx` only** — no emoji, no image files, no inline SVG elsewhere
3. **All fonts via `Fonts.*`** — no hardcoded font family strings anywhere
4. **All colors via `Colors.*`** — no hardcoded hex values anywhere
5. **Type-check before committing** — run `npx tsc --noEmit` from `mobile/` and fix all errors
6. **Don't add features beyond what's asked** — no "while I'm here" cleanup or refactors
7. **Don't change existing screen layouts** — new screens can follow the same patterns, but don't touch existing ones unless instructed

---

## Adding a new feature — checklist

1. Branch off `main`: `git checkout -b feature/your-feature`
2. Add new screen(s) in `src/screens/` following existing patterns
3. Add route to `RootStackParamList` in `types/index.ts`
4. Register screen in `AppNavigator.tsx`
5. Use only existing components and tokens — do not invent new design patterns
6. Run `npx tsc --noEmit` — zero errors required
7. Tell the user: "Ready to open a PR" — do not push without confirmation

---

## Supabase
- Project URL: `https://qdlfiewspjgbucszezja.supabase.co`
- URL + anon key are in `app.json` under `extra.supabaseUrl` / `extra.supabaseAnonKey`
- Auth reads from `Constants.expoConfig.extra` (not `process.env`)
- Email confirmation is currently **disabled** for testing — re-enable before launch

---

## GitHub Pages deployment
- Workflow: `.github/workflows/deploy-pages.yml`
- Triggers on push to `main` when `mobile/**` files change
- `experiments.baseUrl: "/Just-a-pinch"` in `app.json` is critical — do not remove it
- Pages source must be set to "GitHub Actions" in repo Settings → Pages

---

## Running locally
```bash
cd mobile
npm install --legacy-peer-deps
npx expo start --web        # web dev server
npx expo start              # native via Expo Go
npx tsc --noEmit            # type check
```
