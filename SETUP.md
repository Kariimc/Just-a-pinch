# Just a Pinch — Setup Guide

## Prerequisites
- Node.js 18+
- Expo Go installed on your Android phone
- Both your phone and computer on the same Wi-Fi network

---

## 1. Find your machine's local IP address

```bash
# On Linux/Mac
ip route get 1 | awk '{print $7}' | head -1
# or
hostname -I | awk '{print $1}'
```

Example: `192.168.1.42`

---

## 2. Set up Supabase (for AI / recipe import)

1. Go to https://supabase.com and create a free project
2. Go to **Settings → API** and copy:
   - Project URL  
   - anon/public key
3. Go to **Settings → Edge Functions** and set secret: `ANTHROPIC_API_KEY` = your Anthropic key
4. Deploy the edge function:
   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase functions deploy claude-proxy
   ```

---

## 3. Start the backend

```bash
cd backend
cp .env.example .env
# Edit .env with your Supabase URL and anon key
npm start
```

Backend runs on `http://0.0.0.0:3001`

---

## 4. Configure the mobile app

Edit `mobile/app.json` — replace `YOUR_MACHINE_IP` with your actual IP:

```json
"extra": {
  "apiUrl": "http://192.168.1.42:3001"
}
```

---

## 5. Run the app on your phone

```bash
cd mobile
npx expo start
```

1. A QR code appears in the terminal
2. Open **Expo Go** on your Android phone
3. Tap **Scan QR code** and scan it
4. The app loads on your phone

---

## Project Structure

```
Just-a-pinch/
├── mobile/                  # Expo React Native app (TypeScript)
│   ├── src/
│   │   ├── screens/        # All screens (auth, home, recipe, etc.)
│   │   ├── components/     # Reusable UI components
│   │   ├── navigation/     # React Navigation setup
│   │   ├── store/          # AsyncStorage data layer
│   │   ├── services/       # API calls to backend
│   │   ├── theme/          # Colors, fonts, spacing
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Helpers
│   └── App.tsx
├── backend/                 # Node.js/Express API server
│   └── server.js           # API routes (import, AI generate, OCR)
├── supabase/
│   └── functions/
│       └── claude-proxy/   # Edge function: proxies Anthropic API calls
└── SPECIFICATION.md        # Full app spec
```

## Key Features Implemented

- **Splash → Onboarding → Personalization Quiz**
- **Home feed** with greeting, filters, recipe carousels, AI card
- **Recipe detail** with servings scaler, unit toggle, tabs (ingredients/method/nutrition), notes
- **Cooking mode** — full-screen dark mode, step-by-step, keep-awake, inline timers, ingredient overlay
- **Recipe import from URL** — backend scrapes + Claude structures it
- **AI recipe generator** — prompt → Claude generates full recipe
- **Manual recipe editor** — add title, photo, servings, ingredients, steps
- **Library** — grid/list toggle, filter by category
- **Meal planner** — weekly calendar, add recipes to meal slots
- **Shopping list** — grouped by aisle, check off items, add manually
- **Local device storage** — everything persists in AsyncStorage

## Data Flow

```
Phone ──→ AsyncStorage (recipes, collections, plan, shopping, profile)
Phone ──→ Backend (3001) ──→ Supabase Edge Function ──→ Claude API
                                                      ──→ Anthropic key stays server-side
```
