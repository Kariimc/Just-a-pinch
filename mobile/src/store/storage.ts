import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe, Collection, MealPlanEntry, ShoppingItem, PantryItem, UserProfile } from '../types';

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

// ── Recipes ──────────────────────────────────────────────
export async function getRecipes(): Promise<Recipe[]> {
  return (await get<Recipe[]>(KEYS.recipes)) ?? [];
}

export async function saveRecipe(recipe: Recipe): Promise<void> {
  const all = await getRecipes();
  const idx = all.findIndex(r => r.id === recipe.id);
  if (idx >= 0) all[idx] = recipe;
  else all.unshift(recipe);
  await set(KEYS.recipes, all);
}

export async function deleteRecipe(id: string): Promise<void> {
  const all = await getRecipes();
  await set(KEYS.recipes, all.filter(r => r.id !== id));
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const all = await getRecipes();
  return all.find(r => r.id === id) ?? null;
}

// ── Collections ───────────────────────────────────────────
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

// ── Meal Plan ─────────────────────────────────────────────
export async function getMealPlan(): Promise<MealPlanEntry[]> {
  return (await get<MealPlanEntry[]>(KEYS.mealPlan)) ?? [];
}

export async function saveMealEntry(entry: MealPlanEntry): Promise<void> {
  const all = await getMealPlan();
  const idx = all.findIndex(e => e.id === entry.id);
  if (idx >= 0) all[idx] = entry;
  else all.push(entry);
  await set(KEYS.mealPlan, all);
}

export async function deleteMealEntry(id: string): Promise<void> {
  const all = await getMealPlan();
  await set(KEYS.mealPlan, all.filter(e => e.id !== id));
}

// ── Shopping ──────────────────────────────────────────────
export async function getShoppingItems(): Promise<ShoppingItem[]> {
  return (await get<ShoppingItem[]>(KEYS.shopping)) ?? [];
}

export async function saveShoppingItems(items: ShoppingItem[]): Promise<void> {
  await set(KEYS.shopping, items);
}

export async function toggleShoppingItem(id: string): Promise<void> {
  const items = await getShoppingItems();
  const item = items.find(i => i.id === id);
  if (item) item.checked = !item.checked;
  await set(KEYS.shopping, items);
}

// ── Pantry ───────────────────────────────────────────────
export async function getPantryItems(): Promise<PantryItem[]> {
  return (await get<PantryItem[]>(KEYS.pantry)) ?? [];
}

export async function savePantryItems(items: PantryItem[]): Promise<void> {
  await set(KEYS.pantry, items);
}

// ── Profile ───────────────────────────────────────────────
export async function getProfile(): Promise<UserProfile | null> {
  return get<UserProfile>(KEYS.profile);
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await set(KEYS.profile, profile);
}

// ── Onboarding flag ───────────────────────────────────────
export async function isOnboarded(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEYS.onboarded)) === 'true';
}

export async function setOnboarded(): Promise<void> {
  await AsyncStorage.setItem(KEYS.onboarded, 'true');
}
