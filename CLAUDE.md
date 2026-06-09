# Just a Pinch — Agent Handoff

## What this project is
A warm, editorial recipe app for iOS, Android, and web. Stack: **Expo ~56 managed workflow**, React Navigation 7, Supabase (auth + storage), TypeScript.

- **Repo**: https://github.com/Kariimc/Just-a-pinch
- **Stable branch**: `main` — source of truth. All feature work branches off here.
- **Web preview**: blocked — repo is private, GitHub Pages requires public repo or paid plan.

---

## Agent Behavior — Mandatory Rules (read first, always)

### Decision Framework
Whenever deciding on a feature implementation, code architecture, or UI component structure — stop and present **exactly 5 unique, distinct options**. Each option must include plain-English technical reasoning and clear pros/cons specifically for an Expo Go environment. The user chooses; the agent builds. No exceptions.

The agent has **zero unilateral authority** to make spontaneous changes, refactors, or add undocumented features. If a change or alternative path seems needed, ask first — present options, justify each, wait for a decision.

### Communication Style
Always explain technical concepts, code logic, and architectural decisions in **simple, plain language** — no engineering jargon, no dense academic phrasing. Write as if the reader is on a phone screen with one hand. Break down the *why* behind every decision so trade-offs are obvious and easy to evaluate. Short sentences. Clear structure.

### Standing Permission — Rule Merging
When the user states a new operational rule or system instruction in chat, **automatically merge it into this CLAUDE.md file** and push it to the remote branch. No confirmation needed. Rules take effect immediately.

---

## THE DESIGN IS LOCKED

Do not redesign, restyle, reorder, or "improve" any existing screen. Do not change spacing, font sizes, colors, border radii, or component layouts unless the user explicitly requests it and describes the exact change.

**Permitted**: adding new screens, new data, new logic, new navigation routes, wiring up real Supabase data to existing UI placeholders.

**Not permitted**: changing the look of anything that already exists unless directly instructed.

---

## Current SDK state (critical — read before touching packages)

The project runs **Expo SDK 56** with **React Native 0.81.5**. A previous misconfiguration had `expo@54` paired with RN 0.81.5, which caused an immediate native crash on Android on every launch. This was fixed in this session.

**Do not downgrade any of these — they must all stay aligned:**

```json
"expo": "~56.0.0",
"react-native": "0.81.5",
"react": "19.1.0",
"expo-modules-core": "~56.x  (installed by expo automatically)",
"@expo/metro-runtime": "^56.0.13"
```

All `expo-*` packages are at their `~56.x` versions. Do not mix SDK versions.

When adding a new expo package, always use `npx expo install <package>` — it resolves the SDK-compatible version automatically.

---

## What was built this session (Section 1 checklist)

### New files added
| File | Purpose |
|---|---|
| `mobile/src/lib/haptics.ts` | Platform-safe haptic helpers: `hapticLight`, `hapticMedium`, `hapticStep`, `hapticSuccess` |
| `mobile/src/lib/notifications.ts` | Daily reminder scheduling: `requestNotificationPermission`, `scheduleDailyReminder`, `cancelDailyReminder` |
| `mobile/src/store/settingsStorage.ts` | AsyncStorage wrapper for `AppSettings` (notificationsEnabled, hour, minute) |
| `mobile/src/screens/settings/SettingsScreen.tsx` | Settings screen — notification toggle, time picker, minute chips |

### Files modified
| File | Change |
|---|---|
| `mobile/App.tsx` | Added `ErrorBoundary` component (diagnostic — safe to remove later) |
| `mobile/app.json` | Added `expo-notifications` plugin entry; added EAS `projectId` |
| `mobile/src/navigation/AppNavigator.tsx` | Added `Settings` route → `SettingsScreen` |
| `mobile/src/screens/home/HomeScreen.tsx` | Avatar taps navigate to `Settings` |
| `mobile/src/screens/recipe/CookingModeScreen.tsx` | `hapticStep` on next step, `hapticSuccess` on done |
| `mobile/src/screens/capture/RecipeEditorScreen.tsx` | `hapticSuccess` after save |
| `mobile/src/screens/shopping/ShoppingScreen.tsx` | `hapticLight` on item toggle |
| `mobile/package.json` | Upgraded expo 54→56, all expo-* packages, react-native-svg 15.8→15.15.5, added hermes-compiler |

---

## Known issues resolved this session

| Issue | Root cause | Fix |
|---|---|---|
| App crashed immediately on Android | `expo@54` native modules built for RN 0.76, shipped with RN 0.81.5 JS | Upgraded all packages to Expo SDK 56 |
| Metro bundle failed | `react-native-svg@15.8` imported Node.js `buffer` module | Upgraded to `react-native-svg@15.15.5` |
| EAS build failed (Gradle 504) | `--clear-cache` forced Gradle download from unavailable CDN | Removed `--clear-cache` flag |
| Notification API mismatch | SDK 56 renamed `shouldShowAlert` → `shouldShowBanner` + `shouldShowList` | Updated `notifications.ts` |
| EAS Gradle phase failed | `@expo/metro-config@56.0.13` unconditionally resolves `hermes-compiler/package.json` before trying bundled hermesc; crash before bundle produced | Added `hermes-compiler` to `package.json` |

---

## Pending / open items

- **Android APK**: Build #45 triggered by hermes-compiler fix (PR #17). Verify the APK opens before declaring Section 1 complete.
- **ErrorBoundary in App.tsx**: Diagnostic component left in place. Remove it once the APK is confirmed working.
- **GitHub Pages (web preview)**: Blocked — the repo is private. Options: (a) make repo public in GitHub Settings → Danger Zone, or (b) upgrade GitHub plan. No code change needed.
- **iOS testing**: Section 1 haptics and notifications untested on iOS. Need physical device or TestFlight build.

---

## Git workflow

- **All new features** → branch off `main`, name it `feature/short-description`
- **Fixes** → branch off `main`, open PR, merge — do not push directly to `main` (branch protection is on)
- **Never merge to `main` without user confirming**
- Pushing via `git push` will fail (403) — use the GitHub MCP tools (`mcp__github__push_files`, `mcp__github__create_pull_request`, `mcp__github__merge_pull_request`) to push and merge

---

## Project structure
```
mobile/                   ← Expo app root
  App.tsx                 ← Loads fonts, hides splash, ErrorBoundary, renders AppNavigator
  app.json                ← experiments.baseUrl = "/Just-a-pinch"; expo-notifications plugin; EAS projectId
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
      settings/           ← SettingsScreen (NEW)
      SearchScreen.tsx
    navigation/
      AppNavigator.tsx    ← Stack + Tab navigator; wraps AuthProvider
    context/
      AuthContext.tsx     ← Supabase session; useAuth() hook
    lib/
      supabase.ts         ← Supabase client (reads from app.json extra)
      db.ts               ← DB helpers (uploadRecipeImage, etc.)
      haptics.ts          ← Platform-safe haptic wrappers (NEW)
      notifications.ts    ← Daily reminder scheduling (NEW)
    store/
      storage.ts          ← AsyncStorage wrappers (getRecipes, saveRecipe, getProfile, etc.)
      settingsStorage.ts  ← AppSettings persistence (NEW)
    theme/
      index.ts            ← ALL design tokens live here. Never hardcode values.
    types/
      index.ts            ← RootStackParamList, Recipe, Ingredient, Step
    utils/
      id.ts               ← uid() helper
.github/workflows/
  deploy-pages.yml        ← Triggers on push to main when mobile/** changes
  build-android.yml       ← EAS Android APK build (workflow_dispatch or push to main)
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
Spacing.xs = 4 | .sm = 8 | .md = 14 | .lg = 22 | .xl = 32
```

---

## Rules every agent must follow

1. **`StyleSheet.absoluteFillObject`** — never `StyleSheet.absoluteFill` (causes TS spread error)
2. **Icons from `Icon.tsx` only** — no emoji, no image files, no inline SVG elsewhere
3. **All fonts via `Fonts.*`** — no hardcoded font family strings anywhere
4. **All colors via `Colors.*`** — no hardcoded hex values anywhere
5. **Type-check before committing** — run `npx tsc --noEmit` from `mobile/` and fix all errors
6. **Don't add features beyond what's asked** — no "while I'm here" cleanup or refactors
7. **Don't change existing screen layouts** — new screens follow existing patterns only
8. **Expo SDK 56 only** — do not change the `expo` package version or mix SDK versions

---

## Adding a new feature — checklist

1. Branch off `main`: `git checkout -b feature/your-feature`
2. Add new screen(s) in `src/screens/` following existing patterns
3. Add route to `RootStackParamList` in `types/index.ts`
4. Register screen in `AppNavigator.tsx`
5. Use only existing components and tokens — do not invent new design patterns
6. Run `npx tsc --noEmit` — zero errors required
7. Push via MCP tools, open PR, tell user "Ready to merge" — never auto-merge

---

## Supabase
- Project URL: `https://qdlfiewspjgbucszezja.supabase.co`
- URL + anon key are in `app.json` under `extra.supabaseUrl` / `extra.supabaseAnonKey`
- Auth reads from `Constants.expoConfig.extra` (not `process.env`)
- Email confirmation is currently **disabled** for testing — re-enable before launch

---

## EAS / Android build
- EAS project ID: `be46212c-555a-4f61-8c1c-07224d7e4807` (in `app.json` extra.eas.projectId)
- Build profile: `preview` → outputs `.apk` sideload file
- Trigger: push to `main` or `workflow_dispatch` in GitHub Actions
- APK artifact available for 7 days under the `Build Android APK` Actions run
- `EXPO_TOKEN` and `SUPABASE_ANON_KEY` must be set as GitHub repository secrets

---

## Running locally
```bash
cd mobile
npm install --legacy-peer-deps
npx expo start --web        # web dev server
npx expo start              # native via Expo Go
npx tsc --noEmit            # type check
```