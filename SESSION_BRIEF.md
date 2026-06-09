# ReciMe — Agent Session Brief

> Paste this file at the start of every new session to orient your agent instantly.

---

## 🏗️ Project Identity

| | |
|---|---|
| **App Name** | ReciMe Clone |
| **Repo** | `kariimc/just-a-pinch` (single repo, all code lives here) |
| **Dev Branch** | `claude/app-pivot-y0t1ua` |
| **Testing** | Expo Go on physical device |
| **Build** | GitHub Actions → `.apk` (EAS bypassed, free tier exhausted) |
| **Environment** | 100% mobile — GitHub Codespaces / Replit Web |

---

## 🔒 Tech Stack (Locked — Do Not Change)

| Layer | Choice |
|---|---|
| Framework | Expo (Latest SDK) + **Expo Router** (file-based) |
| Styling | **NativeWind v4** (Tailwind utility classes) |
| Animation | **Reanimated V3** (UI-thread worklets) |
| Gestures | **RNGH v2** (`GestureDetector` API) |
| Lists | **Shopify FlashList** |
| Bottom Sheets | **@gorhom/bottom-sheet** |
| Backend | **Supabase** (PostgreSQL + Realtime + Edge Functions) |
| Voice TTS | `expo-speech` |
| Voice STT | `expo-av` → Supabase Edge Function → Whisper |

---

## 🎬 Motion System (Locked — "Cinematic Editorial")

Every animation in the app inherits from these tokens.
File lives at: `src/theme/motion.ts`

```
SPRING_COMMIT:    mass 0.55 | damping 18 | stiffness 140 | no overshoot
SPRING_PROMOTE:   mass 0.50 | damping 20 | stiffness 160 | no overshoot
SPRING_SNAPBACK:  mass 0.30 | damping 28 | stiffness 260 | no overshoot

EASING_EXIT:      cubic-bezier(0.22, 0.80, 0.36, 1.0)
EASING_FADE:      Ease Out Quad

DURATION_EXIT:    400ms
DURATION_FADE:    300ms
PERSPECTIVE:      1200px

Deck depth:
  Card[1]: scale 0.90 | rotateY 8deg | translateY 18
  Card[2]: scale 0.80 | rotateY 8deg | translateY 36
```

**Identity:** No bounce. No overshoot. Every move is intentional and weighted.
Cards carry physical mass and 3D depth. Premium without being cold.

---

## 📋 The 5 Phases

### Legend
```
⬜ Not Started
🔄 In Progress
✅ Complete
🔒 Locked (cannot be changed)
```

---

### Phase 1 — Foundation ⬜
*Every other phase depends on this. Nothing starts until this gate passes.*

- [ ] Expo Router file structure scaffolded, all routes as empty shells
- [ ] NativeWind v4 installed and verified on physical device
- [ ] `src/theme/motion.ts` — Cinematic Editorial tokens
- [ ] `src/theme/index.ts` — colors, typography, spacing
- [ ] Navigation shell (tabs + stack) fully wired
- [ ] Auth screens (Login, Signup) — static, no Supabase yet
- [ ] FlashList, Reanimated V3, RNGH v2, @gorhom/bottom-sheet installed
- [ ] Smoke test: app launches in Expo Go, all routes navigable

**Gate to Phase 2:** App launches clean. All routes render. Fonts and colors correct.

---

### Phase 2 — Interaction Core ⬜
*Validate animation physics on physical device before building features on top.*

- [ ] Cook Mode gesture deck — full Reanimated V3 engine (Feature #3)
- [ ] Serving Scaler odometer — `useDerivedValue` slot-machine (Feature #2)
- [ ] Motion tokens adjusted if spring feel is off on physical device

**Gate to Phase 3:** Both animations feel correct on glass at 60fps. Springs locked.

---

### Phase 3 — Design Lock ⬜ *(Your Phase)*
*You take the working prototype into your design tool.*

- [ ] Visual language finalized (colors, typography, spacing)
- [ ] Component visual states defined (press, active, disabled)
- [ ] Figma file locked and shared
- [ ] Agent reads Figma via MCP, extracts tokens directly

**Gate to Phase 4:** Design system frozen. Nothing visual changes after this.

---

### Phase 4 — Feature Completion ⬜
*All remaining features built on locked design + locked motion tokens.*

Build order (simpler → complex):
- [ ] Aisle-Sorted Grocery List — `useMemo` + FlashList (Feature #4)
- [ ] Instacart Deep-Link Automation — `Linking.openURL()` (Feature #6)
- [ ] Mise en Place Checklist — `@gorhom/bottom-sheet` (Feature #5)
- [ ] Daily Discovery Deck UI — frontend shell only (Feature #7)
- [ ] Voice Guide TTS — `expo-speech`, session-level opt-in (Feature #8 local)

**Gate to Phase 5:** Every feature navigable, animated, gesture-complete. Zero broken states.

---

### Phase 5 — Backend & Production ⬜
*All cloud wiring in one focused pass.*

- [ ] Supabase schema + RLS migrations
- [ ] AI Link Importer — Gemini Flash Edge Function (Feature #1)
- [ ] AI Sous Chef — SSE stream Edge Function (Feature #9)
- [ ] Voice STT — Whisper transcription Edge Function (Feature #8 backend)
- [ ] `pg_cron` daily discovery seed (Feature #7 backend)
- [ ] GitHub Actions APK build pipeline
- [ ] Security review — `.env` audit, vault check, RLS policies

**Gate:** Full end-to-end flow works. APK builds clean. Ships.

---

## 📍 Current Status

```
Current Phase:  1 — Foundation
Current Task:   Not started — ready to scaffold
Last Commit:    Session brief added
```

> Update this block at the end of every session before committing.

---

## 🧠 Cook Mode — Fully Blueprinted (Phase 2, Feature #3)

All 9 decisions locked:

| Decision | Choice |
|---|---|
| Commit trigger | Hybrid — velocity > 800px/s OR drag > 45% screen width |
| Boundary — first card | Elastic rubber-band (resistance 0.18), hard spring-back |
| Boundary — last card | Fires completion lifecycle (no loop) |
| Swipe direction | Horizontal only. Exit via dedicated header button |
| Stack depth | 3 cards total (1 active + 2 followers) |
| 3D effect | Scale + Y-rotation + shadow depth (perspective 1200) |
| Gesture conflict | `activeOffsetX: [-12, 12]` — horizontal locks first |
| Interactive elements | Nested `Gesture.Exclusive()` shields timer chip from pan |
| Voice auto-read | Session opt-in toggle on Recipe Detail screen before entering |
| Completion state | Particle burst (1.2s) → Rating + Log Cook bottom sheet |

**File structure:**
```
app/cook-mode/[recipeId].tsx
src/components/cook-mode/
  DeckContainer.tsx
  StepCard.tsx
  FollowerCard.tsx
  TimerChip.tsx
  CompletionSheet.tsx
  ParticleBurst.tsx
src/hooks/useCookMode.ts
```

---

## 🍽️ All 9 Features — Status Tracker

| # | Feature | Phase | Status |
|---|---|---|---|
| 1 | AI Link Importer (Gemini Edge Fn) | 5 | ⬜ |
| 2 | Serving Scaler Odometer | 2 | ⬜ |
| 3 | Cook Mode Gesture Deck | 2 | ⬜ (Blueprint 🔒) |
| 4 | Aisle-Sorted Grocery List | 4 | ⬜ |
| 5 | Mise en Place Bottom Sheet | 4 | ⬜ |
| 6 | Instacart Deep-Link | 4 | ⬜ |
| 7 | Daily Discovery (UI + pg_cron) | 4+5 | ⬜ |
| 8 | Voice Commands (TTS + Whisper) | 4+5 | ⬜ |
| 9 | AI Sous Chef SSE Stream | 5 | ⬜ |

---

## ⚠️ Hard Rules (Agent Must Follow)

1. **Interview before coding** — no feature gets built without a clarifying Q&A first
2. **Blueprint before implementation** — architecture documented before code written
3. **Working features only** — nothing broken gets committed or pushed
4. **Single repo** — all code stays in `kariimc/just-a-pinch`
5. **Delete branches after merge** — no stale branch accumulation
6. **No hardcoded keys** — `.env` locally, Supabase vault in production
7. **No EAS** — GitHub Actions only for APK builds
8. **Design is locked after Phase 3** — no visual drift in later features
9. **Motion tokens are locked after Phase 2** — no spring value changes after device validation
10. **Push via GitHub MCP only** — `git push` will 403 in this environment

---

## 🚀 How to Resume a Session

Paste this at the start of a new chat:

```
I'm building ReciMe — a high-fidelity recipe app.
Read SESSION_BRIEF.md in the repo root for full context.
We are currently on: [Phase X — Name].
Last completed task: [describe it].
Next task: [describe it].
Continue from here.
```

---

*Last updated: Phase 1 not yet started — project pivot complete, blueprinting done.*
