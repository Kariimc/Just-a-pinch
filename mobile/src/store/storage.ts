import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe, Collection, MealPlanEntry, ShoppingItem, PantryItem, UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import {
  dbGetRecipes, dbGetRecipe, dbSaveRecipe, dbDeleteRecipe,
  dbGetMealPlan, dbSaveMealEntry, dbDeleteMealEntry,
  dbGetShoppingItems, dbSaveShoppingItems, dbToggleShoppingItem,
  dbGetProfile, dbSaveProfile,
  dbGetFeaturedRecipes,
} from '../lib/db';

const KEYS = {
  recipes: '@jap_recipes',
  collections: '@jap_collections',
  mealPlan: '@jap_meal_plan',
  shopping: '@jap_shopping',
  pantry: '@jap_pantry',
  profile: '@jap_profile',
  // Holds a profile edit that hasn't yet made it to the DB, so a stale DB read
  // can't clobber it on the next getProfile (the "Settings saved but Home shows
  // the old name" bug). Cleared once the edit successfully syncs.
  profileDirty: '@jap_profile_dirty',
  onboarded: '@jap_onboarded',
};

async function get<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function set<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function remove(key: string): Promise<void> {
  try { await AsyncStorage.removeItem(key); } catch { /* ignore */ }
}

async function authed(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

// Fires after writes that can advance badge progress. badges.ts registers the
// sole listener at module init; a callback keeps the dependency one-way.
let onMutation: (() => void) | null = null;
export function setStorageMutationListener(cb: (() => void) | null): void {
  onMutation = cb;
}

// ── Recipes ──────────────────────────────────────────────────────────────────

export async function getRecipes(): Promise<Recipe[]> {
  if (await authed()) {
    try {
      const recipes = await dbGetRecipes();
      await set(KEYS.recipes, recipes);
      return recipes;
    } catch {
      return (await get<Recipe[]>(KEYS.recipes)) ?? [];
    }
  }
  return (await get<Recipe[]>(KEYS.recipes)) ?? [];
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  if (await authed()) {
    try {
      return await dbGetRecipe(id);
    } catch {
      const all = (await get<Recipe[]>(KEYS.recipes)) ?? [];
      return all.find(r => r.id === id) ?? null;
    }
  }
  const all = (await get<Recipe[]>(KEYS.recipes)) ?? [];
  return all.find(r => r.id === id) ?? null;
}

export async function saveRecipe(recipe: Recipe): Promise<void> {
  // Skip the getSession() check — getSession() can return null on web before
  // the SDK hydrates from localStorage, even when the user is authenticated.
  // dbSaveRecipe calls getUser() (server-authoritative) and throws if not auth'd.
  try { await dbSaveRecipe(recipe); } catch { /* not signed in or offline */ }
  const all = (await get<Recipe[]>(KEYS.recipes)) ?? [];
  const idx = all.findIndex(r => r.id === recipe.id);
  if (idx >= 0) all[idx] = recipe;
  else all.unshift(recipe);
  await set(KEYS.recipes, all);
  onMutation?.();
}

export async function deleteRecipe(id: string): Promise<void> {
  if (await authed()) {
    try { await dbDeleteRecipe(id); } catch { /* fall through */ }
  }
  const all = (await get<Recipe[]>(KEYS.recipes)) ?? [];
  await set(KEYS.recipes, all.filter(r => r.id !== id));
}

// ── Collections ───────────────────────────────────────────────────────────────

export async function getCollections(): Promise<Collection[]> {
  return (await get<Collection[]>(KEYS.collections)) ?? [];
}

export async function saveCollection(col: Collection): Promise<void> {
  const all = await getCollections();
  const idx = all.findIndex(c => c.id === col.id);
  if (idx >= 0) all[idx] = col;
  else all.unshift(col);
  await set(KEYS.collections, all);
}

export async function deleteCollection(id: string): Promise<void> {
  const all = await getCollections();
  await set(KEYS.collections, all.filter(c => c.id !== id));
}

// ── Meal Plan ─────────────────────────────────────────────────────────────────

export async function getMealPlan(): Promise<MealPlanEntry[]> {
  if (await authed()) {
    try {
      const entries = await dbGetMealPlan();
      await set(KEYS.mealPlan, entries);
      return entries;
    } catch {
      return (await get<MealPlanEntry[]>(KEYS.mealPlan)) ?? [];
    }
  }
  return (await get<MealPlanEntry[]>(KEYS.mealPlan)) ?? [];
}

export async function saveMealEntry(entry: MealPlanEntry): Promise<void> {
  try { await dbSaveMealEntry(entry); } catch { /* not signed in or offline */ }
  const all = (await get<MealPlanEntry[]>(KEYS.mealPlan)) ?? [];
  const idx = all.findIndex(e => e.id === entry.id);
  if (idx >= 0) all[idx] = entry;
  else all.push(entry);
  await set(KEYS.mealPlan, all);
  onMutation?.();
}

export async function deleteMealEntry(id: string): Promise<void> {
  if (await authed()) {
    try { await dbDeleteMealEntry(id); } catch { /* fall through */ }
  }
  const all = (await get<MealPlanEntry[]>(KEYS.mealPlan)) ?? [];
  await set(KEYS.mealPlan, all.filter(e => e.id !== id));
}

// ── Shopping ──────────────────────────────────────────────────────────────────

export async function getShoppingItems(): Promise<ShoppingItem[]> {
  if (await authed()) {
    try {
      const items = await dbGetShoppingItems();
      await set(KEYS.shopping, items);
      return items;
    } catch {
      return (await get<ShoppingItem[]>(KEYS.shopping)) ?? [];
    }
  }
  return (await get<ShoppingItem[]>(KEYS.shopping)) ?? [];
}

export async function saveShoppingItems(items: ShoppingItem[]): Promise<void> {
  try { await dbSaveShoppingItems(items); } catch { /* not signed in or offline */ }
  await set(KEYS.shopping, items);
}

export async function toggleShoppingItem(id: string): Promise<void> {
  if (await authed()) {
    try { await dbToggleShoppingItem(id); } catch { /* fall through */ }
  }
  const items = (await get<ShoppingItem[]>(KEYS.shopping)) ?? [];
  const item = items.find(i => i.id === id);
  if (item) item.checked = !item.checked;
  await set(KEYS.shopping, items);
}

// ── Pantry ────────────────────────────────────────────────────────────────────

export async function getPantryItems(): Promise<PantryItem[]> {
  return (await get<PantryItem[]>(KEYS.pantry)) ?? [];
}

export async function savePantryItems(items: PantryItem[]): Promise<void> {
  await set(KEYS.pantry, items);
}

// ── Profile ───────────────────────────────────────────────────────────────────

// Fill missing name/email from the auth user. Covers accounts that confirmed
// email and logged in without ever running the quiz (no profile row), and
// rows saved before the name was captured — so greetings never come up blank.
// Legacy rows hold "First Last" in `name` (signup metadata) with no lastName —
// split it so the family-cookbook cover gets a surname without re-entry.
function splitLegacyName(p: UserProfile): UserProfile {
  const n = p.name?.trim() ?? '';
  if (p.lastName?.trim() || !n.includes(' ')) return p;
  const words = n.split(/\s+/);
  return { ...p, name: words[0], lastName: words.slice(1).join(' ') };
}

async function healProfile(profile: UserProfile | null): Promise<UserProfile | null> {
  if (profile?.name?.trim() && profile.email) {
    const fixed = splitLegacyName(profile);
    if (fixed !== profile) await saveProfile(fixed);
    return fixed;
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return profile;

  const metaName = (user.user_metadata?.name as string | undefined)?.trim();
  const name = profile?.name?.trim() || metaName || user.email?.split('@')[0] || '';
  const healed: UserProfile = splitLegacyName({
    id: profile?.id ?? user.id,
    name,
    lastName: profile?.lastName,
    email: profile?.email || user.email || '',
    dietaryPrefs: profile?.dietaryPrefs ?? [],
    skillLevel: profile?.skillLevel ?? 'confident',
    householdSize: profile?.householdSize ?? 2,
    preferMetric: profile?.preferMetric ?? false,
    darkMode: profile?.darkMode ?? false,
    avatarUri: profile?.avatarUri,
  });
  await saveProfile(healed);
  return healed;
}

export async function getProfile(): Promise<UserProfile | null> {
  // An edit that never reached the DB outranks whatever the DB returns —
  // otherwise a failed write would let the stale row overwrite the user's
  // change. Retry pushing it while we're here; only on success do we let the
  // DB become the source of truth again.
  const dirty = await get<UserProfile>(KEYS.profileDirty);

  if (await authed()) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Only re-push a pending edit if it belongs to the signed-in account —
      // a leftover edit from a previous user (sign-out keeps local data) must
      // never be written onto someone else's profile.
      if (dirty && user && dirty.id === user.id) {
        try {
          await dbSaveProfile(dirty);
          await remove(KEYS.profileDirty);
        } catch {
          await set(KEYS.profile, dirty);
          return dirty;
        }
      } else if (dirty) {
        await remove(KEYS.profileDirty);
      }
      const profile = await healProfile(await dbGetProfile());
      if (profile) {
        await set(KEYS.profile, profile);
        return profile;
      }
    } catch { /* fall through */ }
  }

  return dirty ?? (await get<UserProfile>(KEYS.profile));
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  // Local first so the UI never loses the edit. Then try the DB: on success
  // the edit is durable; on failure we stash it as "dirty" so the next
  // getProfile re-pushes it instead of reading back the stale row. (This is
  // what fixes "Settings saved the new name but Home still shows the old one.")
  await set(KEYS.profile, profile);
  try {
    await dbSaveProfile(profile);
    await remove(KEYS.profileDirty);
  } catch {
    await set(KEYS.profileDirty, profile);
  }
}

// ── Featured Recipes ──────────────────────────────────────────────────────────

export async function getFeaturedRecipes(): Promise<Recipe[]> {
  try {
    return await dbGetFeaturedRecipes();
  } catch {
    return [];
  }
}

// ── Onboarding flag ───────────────────────────────────────────────────────────

export async function isOnboarded(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEYS.onboarded)) === 'true';
}

export async function setOnboarded(): Promise<void> {
  await AsyncStorage.setItem(KEYS.onboarded, 'true');
}

// ── Account deletion ──────────────────────────────────────────────────────────

// Wipes every local trace of the user (recipes, plan, shopping, profile,
// settings, badges, onboarding) — all of this app's '@jap_' keys.
export async function clearLocalData(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const ours = keys.filter(k => k.startsWith('@jap_'));
  if (ours.length) await AsyncStorage.multiRemove(ours);
}

// Permanently deletes the signed-in user's account. A privileged edge function
// removes the auth user (cascading to all their server data); we then drop the
// session and clear this device's local copy. Throws a readable message on
// failure so the caller can surface it.
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', { body: {} });
  if (error) {
    let message = 'Could not delete your account. Please try again.';
    try {
      const ctx = await (error as { context?: Response }).context?.json();
      if (ctx?.error) message = String(ctx.error);
    } catch { /* keep fallback */ }
    throw new Error(message);
  }
  await supabase.auth.signOut();
  await clearLocalData();
}
