# Recipe App — Full Screen & Feature Specification

A complete page-by-page breakdown for designing a Recime-style recipe app (Android + iOS). Each screen lists every component to lay out.

---

## 1. Onboarding & Auth

### 1.1 Splash Screen
- App logo + brand color background
- Subtle loading animation

### 1.2 Welcome / Intro Carousel
- 3–4 swipeable slides highlighting core value props (Save from anywhere, Cook hands-free, Plan & shop)
- "Get Started" CTA button
- "I already have an account" text link
- Skip button (top right)

### 1.3 Sign Up
- Continue with Apple
- Continue with Google
- Continue with Email (name, email, password fields)
- Terms & Privacy checkbox/links
- Link to Log In

### 1.4 Log In
- Email + password fields
- Social login buttons
- "Forgot password?" link
- Error states (wrong credentials)

### 1.5 Forgot Password
- Email input
- Send reset link button
- Confirmation state

### 1.6 Personalization Quiz (post-signup)
- Dietary preferences (multi-select: vegan, vegetarian, gluten-free, keto, etc.)
- Allergies / disliked ingredients
- Cuisines you love
- Cooking skill level
- Household size (used for default servings)
- "Skip for now" option

---

## 2. Navigation Shell
- Bottom tab bar (5 tabs): **Home**, **Recipes**, **Add (+)**, **Meal Plan**, **Shopping List**
- Center "+" is a prominent action button
- Profile/Settings accessed via avatar in top corner

---

## 3. Home / Discover

### 3.1 Home Feed
- Greeting header ("Good morning, [Name]")
- Search bar (tap → Search screen)
- "Recently added" horizontal carousel
- "What's for dinner?" suggestion cards
- "Cook with what you have" AI entry card
- Featured collections / curated cookbooks
- Trending recipes (if social/discover enabled)
- Quick filters chips (Quick & Easy, Vegetarian, 5 Ingredients, etc.)

### 3.2 Search
- Search input with recent searches
- Filter panel: ingredient, cuisine, meal type, total time, difficulty, dietary tags, source
- Sort options (newest, cook time, rating, A–Z)
- Results grid/list toggle
- Empty state + "no results" state

### 3.3 Discover Feed (social — optional)
- Public recipe cards (image, title, author, likes)
- Follow suggestions
- Category browse

---

## 4. Recipe Capture / Import (the "+")

### 4.1 Add Menu (action sheet)
- Import from link (paste URL)
- Import from social (Instagram, TikTok, YouTube)
- Scan a photo / cookbook (camera + OCR)
- Import from screenshot / photo library
- Paste text
- Create manually
- Generate with AI

### 4.2 Import-in-Progress
- URL/source preview
- Loading/parsing animation
- "We found this recipe" preview before saving

### 4.3 Import Review & Edit
- Auto-parsed fields shown for confirmation
- Editable: title, image, servings, prep/cook time, ingredients, steps, tags, source link
- "Save to collection" selector
- Save button

### 4.4 Manual Recipe Editor
- Cover photo upload (camera/gallery)
- Title
- Description / notes
- Servings / yield
- Prep time, cook time, total time
- Ingredients list (add row, quantity + unit + item, drag to reorder, group into sections e.g. "For the sauce")
- Steps list (add step, reorder, attach photo per step)
- Tags & categories
- Difficulty
- Source / credit field
- Save / Save as draft

### 4.5 AI Recipe Generator
- Prompt input ("a high-protein vegetarian dinner")
- Constraints (servings, time, dietary, ingredients to use/avoid)
- Generated recipe preview → edit → save

---

## 5. Recipe Detail

### 5.1 Recipe View
- Hero image (with overflow menu: edit, share, delete, add to plan, add to list)
- Title, source/author, rating
- Quick stats row: prep, cook, total time, servings, calories
- Servings stepper (live-rescales ingredient quantities)
- Unit toggle (metric/imperial)
- Tabs or sections: **Ingredients** | **Instructions** | **Nutrition** | **Notes**
- Ingredients with checkboxes
- "Add all to shopping list" button
- Instructions (numbered, optional step photos)
- Nutrition facts card (per serving + per recipe)
- Personal notes / edits section
- Reviews/comments (if social)
- Prominent "Start Cooking" button
- Related / similar recipes

### 5.2 Cooking Mode (full-screen)
- Step-by-step large text view
- Swipe / tap / voice to advance
- Keep-screen-awake
- Inline timers (tap a time in a step → start timer)
- Ingredient quick-reference overlay
- Checkable ingredients
- Progress indicator (step X of Y)
- Voice/hands-free toggle
- Exit / pause

### 5.3 Active Timers
- Multiple concurrent timers
- Labeled by step
- Background + notification when done

---

## 6. Recipes Library

### 6.1 My Recipes
- Grid/list toggle
- Sort & filter
- Section by collection or show all
- Multi-select mode (bulk add to collection, delete, add to plan)

### 6.2 Collections / Cookbooks
- List of collections with cover + recipe count
- Create new collection (name, cover, optional shared)
- Collection detail (recipes within, reorder, edit collection)

### 6.3 Favorites
- Quick-access list of starred recipes

---

## 7. Meal Planning

### 7.1 Meal Plan Calendar
- Week view (default) + month view toggle
- Day columns with meal slots: Breakfast, Lunch, Dinner, Snacks
- Drag recipe into a slot / tap empty slot to add
- Add note or non-recipe meal (e.g., "Leftovers", "Eat out")
- Servings override per planned meal

### 7.2 Add to Plan flow
- Pick recipe (from library/search)
- Pick date + meal slot
- Set servings

### 7.3 Plan Actions
- "Generate shopping list from this week"
- Clear week / copy week
- Nutrition summary for the day/week (optional)

---

## 8. Shopping List

### 8.1 Shopping List
- Items grouped by aisle/category (Produce, Dairy, etc.)
- Check off items (strikethrough)
- Quantity + unit per item
- Merged duplicates from multiple recipes (with source recipe reference)
- Manual add item
- Clear checked / clear all
- Multiple named lists (tab or switcher)
- Share list (collaborative)

### 8.2 List Settings
- Aisle/category ordering preference
- Show/hide checked items

---

## 9. Pantry (AI "what can I make")

### 9.1 My Pantry
- List of ingredients you have (add manually, scan receipt, voice)
- Categorized
- Expiry tracking (optional)

### 9.2 Suggestions from Pantry
- "Recipes you can make now" results
- "Almost there (missing 1–2 items)" results with quick add-to-list

---

## 10. Profile & Social (optional tier)

### 10.1 My Profile
- Avatar, name, bio
- Stats (recipes, followers, following)
- My public recipes grid
- Edit profile

### 10.2 Public Profile (other users)
- Their recipes, follow button

### 10.3 Activity / Notifications
- Likes, comments, follows, new recipes from followed users
- System notifications (timers, plan reminders)

---

## 11. Settings

### 11.1 Settings Home
- Account (email, password, connected logins)
- Subscription / Manage plan
- Dietary preferences & allergies
- Default servings / household size
- Units (metric/imperial)
- Notifications preferences
- Appearance (light/dark/system)
- Language / region
- Data: export recipes (PDF/JSON), backup & sync status
- Help & support / FAQ
- About, Terms, Privacy
- Log out / Delete account

---

## 12. Subscription / Paywall

### 12.1 Paywall
- Free vs Premium comparison table
- Feature highlights (unlimited saves, AI, meal planning, nutrition, no ads)
- Monthly / annual toggle (annual savings badge)
- Family plan option
- Restore purchases
- Start free trial CTA

### 12.2 Manage Subscription
- Current plan, renewal date
- Upgrade / downgrade / cancel

---

## 13. Shared / Utility Screens
- **Share Sheet target** (system-level "Save to App")
- **Empty states** for every list (no recipes, no plan, empty list, empty pantry)
- **Error / offline states** (no connection, parse failed, retry)
- **Loading skeletons**
- **Toast / snackbar confirmations**
- **Permission prompts** (camera, notifications, photos)
- **Onboarding tooltips / coach marks** for first use of cooking mode, import, etc.

---

## Cross-Cutting Feature Notes (for design consistency)
- **Servings rescaling** appears anywhere ingredients show
- **Unit toggle** is global preference but overridable per recipe
- **"Add to shopping list"** and **"Add to meal plan"** are available from recipe cards, detail, and search results
- **Dietary tags** drive filtering everywhere
- **Offline indicator** — saved recipes readable offline
- **Dark mode** for all screens (cooking mode especially)
