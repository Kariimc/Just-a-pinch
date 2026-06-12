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
async function healProfile(profile: UserProfile | null): Promise<UserProfile | null> {
  if (profile?.name?.trim() && profile.email) return profile;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return profile;

  const metaName = (user.user_metadata?.name as string | undefined)?.trim();
  const name = profile?.name?.trim() || metaName || user.email?.split('@')[0] || '';
  if (profile && name === profile.name && profile.email) return profile;
  const healed: UserProfile = {
    id: profile?.id ?? user.id,
    name,
    email: profile?.email || user.email || '',
    dietaryPrefs: profile?.dietaryPrefs ?? [],
    skillLevel: profile?.skillLevel ?? 'confident',
    householdSize: profile?.householdSize ?? 2,
    preferMetric: profile?.preferMetric ?? false,
    darkMode: profile?.darkMode ?? false,
    avatarUri: profile?.avatarUri,
  };
  await saveProfile(healed);
  return healed;
}

export async function getProfile(): Promise<UserProfile | null> {
  if (await authed()) {
    try {
      const profile = await healProfile(await dbGetProfile());
      if (profile) {
        await set(KEYS.profile, profile);
        return profile;
      }
    } catch { /* fall through */ }
  }
  return get<UserProfile>(KEYS.profile);
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  if (await authed()) {
    try { await dbSaveProfile(profile); } catch { /* fall through */ }
  }
  await set(KEYS.profile, profile);
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
