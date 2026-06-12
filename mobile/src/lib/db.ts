import { supabase } from './supabase';
import { Recipe, MealPlanEntry, ShoppingItem, UserProfile } from '../types';

// ── Recipes ────────────────────────────────────────────────────────────────────

export async function dbGetRecipes(): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .order('saved_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToRecipe);
}

export async function dbGetRecipe(id: string): Promise<Recipe | null> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .single();
  if (!error && data) return rowToRecipe(data);

  // Fall back to featured recipes
  const { data: featured } = await supabase
    .from('featured_recipes')
    .select('*')
    .eq('id', id)
    .single();
  if (featured) return featuredRowToRecipe(featured);

  return null;
}

export async function dbSaveRecipe(recipe: Recipe): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('recipes')
    .upsert({ ...recipeToRow(recipe), user_id: user.id }, { onConflict: 'id' });
  if (error) throw error;
}

export async function dbDeleteRecipe(id: string): Promise<void> {
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (error) throw error;
}

// ── Meal Plan ──────────────────────────────────────────────────────────────────

export async function dbGetMealPlan(): Promise<MealPlanEntry[]> {
  const { data, error } = await supabase.from('meal_plan').select('*');
  if (error) throw error;
  return (data ?? []).map(rowToMealEntry);
}

export async function dbSaveMealEntry(entry: MealPlanEntry): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('meal_plan')
    .upsert({ ...rowFromMealEntry(entry), user_id: user.id }, { onConflict: 'id' });
  if (error) throw error;
}

export async function dbDeleteMealEntry(id: string): Promise<void> {
  const { error } = await supabase.from('meal_plan').delete().eq('id', id);
  if (error) throw error;
}

// ── Shopping Items ─────────────────────────────────────────────────────────────

export async function dbGetShoppingItems(): Promise<ShoppingItem[]> {
  const { data, error } = await supabase.from('shopping_items').select('*');
  if (error) throw error;
  return (data ?? []).map(rowToShoppingItem);
}

export async function dbSaveShoppingItems(items: ShoppingItem[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  await supabase.from('shopping_items').delete().eq('user_id', user.id);
  if (items.length === 0) return;
  const { error } = await supabase
    .from('shopping_items')
    .insert(items.map(i => ({ ...rowFromShoppingItem(i), user_id: user.id })));
  if (error) throw error;
}

export async function dbToggleShoppingItem(id: string): Promise<void> {
  const { data } = await supabase
    .from('shopping_items')
    .select('checked')
    .eq('id', id)
    .single();
  if (!data) return;
  await supabase.from('shopping_items').update({ checked: !data.checked }).eq('id', id);
}

// ── Profile ────────────────────────────────────────────────────────────────────

export async function dbGetProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!data) return null;
  return {
    id: data.id,
    name: data.name ?? '',
    lastName: data.last_name ?? undefined,
    email: user.email ?? '',
    avatarUri: data.avatar_uri ?? undefined,
    dietaryPrefs: data.dietary_prefs ?? [],
    skillLevel: data.skill_level ?? 'confident',
    householdSize: data.household_size ?? 2,
    preferMetric: data.prefer_metric ?? false,
    darkMode: data.dark_mode ?? false,
  };
}

export async function dbSaveProfile(profile: UserProfile): Promise<void> {
  // Resolve the id server-side: RLS requires auth.uid() = id, and a locally
  // created profile can carry a stale/placeholder id that would make every
  // upsert fail silently. getUser() also works during the web boot window
  // where getSession() still reports null.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    name: profile.name,
    last_name: profile.lastName ?? null,
    avatar_uri: profile.avatarUri ?? null,
    dietary_prefs: profile.dietaryPrefs,
    skill_level: profile.skillLevel,
    household_size: profile.householdSize,
    prefer_metric: profile.preferMetric,
    dark_mode: profile.darkMode,
  });
  if (error) throw error;
}

// ── Image Upload ───────────────────────────────────────────────────────────────

export async function uploadRecipeImage(localUri: string, recipeId: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return localUri;

  try {
    const response = await fetch(localUri);
    const arrayBuffer = await response.arrayBuffer();
    const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
    const path = `${user.id}/${recipeId}.${ext}`;

    const { error } = await supabase.storage
      .from('recipe-images')
      .upload(path, arrayBuffer, { contentType, upsert: true });

    if (error) return localUri;

    const { data } = supabase.storage.from('recipe-images').getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return localUri;
  }
}

// ── Featured Recipes ───────────────────────────────────────────────────────────

export async function dbGetFeaturedRecipes(): Promise<Recipe[]> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('featured_recipes')
    .select('*')
    .gte('featured_date', today)
    .order('created_at', { ascending: false })
    .limit(12);
  if (error) throw error;
  return (data ?? []).map(featuredRowToRecipe);
}

// ── Row mappers ────────────────────────────────────────────────────────────────

function recipeToRow(r: Recipe) {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? null,
    image_uri: r.imageUri ?? null,
    image_color: r.imageColor ?? null,
    servings: r.servings,
    prep_minutes: r.prepMinutes,
    cook_minutes: r.cookMinutes,
    ingredients: r.ingredients,
    steps: r.steps,
    tags: r.tags,
    collections: r.collections,
    source_url: r.sourceUrl ?? null,
    nutrition: r.nutrition ?? null,
    notes: r.notes ?? null,
    rating: r.rating ?? null,
    cooked_count: r.cookedCount ?? 0,
    is_saved: r.isSaved ?? false,
    is_family: r.isFamily ?? false,
    difficulty: r.difficulty ?? null,
    saved_at: r.savedAt,
    created_at: r.createdAt,
  };
}

function rowToRecipe(row: Record<string, any>): Recipe {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    imageUri: row.image_uri ?? undefined,
    imageColor: row.image_color ?? undefined,
    servings: row.servings,
    prepMinutes: row.prep_minutes,
    cookMinutes: row.cook_minutes,
    ingredients: row.ingredients ?? [],
    steps: row.steps ?? [],
    tags: row.tags ?? [],
    collections: row.collections ?? [],
    sourceUrl: row.source_url ?? undefined,
    nutrition: row.nutrition ?? undefined,
    notes: row.notes ?? undefined,
    rating: row.rating ?? undefined,
    cookedCount: row.cooked_count ?? 0,
    isSaved: row.is_saved ?? false,
    isFamily: row.is_family ?? false,
    difficulty: row.difficulty ?? undefined,
    savedAt: row.saved_at,
    createdAt: row.created_at,
  };
}

function rowToMealEntry(row: Record<string, any>): MealPlanEntry {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    date: row.date,
    mealType: row.meal_type,
    servings: row.servings,
  };
}

function rowFromMealEntry(e: MealPlanEntry) {
  return {
    id: e.id,
    recipe_id: e.recipeId,
    date: e.date,
    meal_type: e.mealType,
    servings: e.servings,
  };
}

function rowToShoppingItem(row: Record<string, any>): ShoppingItem {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity ?? '',
    unit: row.unit ?? '',
    category: row.category ?? 'Other',
    checked: row.checked ?? false,
    recipeIds: row.recipe_ids ?? [],
    isManual: row.is_manual ?? false,
  };
}

function rowFromShoppingItem(i: ShoppingItem) {
  return {
    id: i.id,
    name: i.name,
    quantity: i.quantity,
    unit: i.unit,
    category: i.category,
    checked: i.checked,
    recipe_ids: i.recipeIds ?? [],
    is_manual: i.isManual ?? false,
  };
}

function featuredRowToRecipe(row: Record<string, any>): Recipe {
  const ts = new Date(row.created_at ?? Date.now()).getTime();
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    imageUri: row.image_uri ?? undefined,
    imageColor: row.image_color ?? 'toast',
    servings: row.servings,
    prepMinutes: row.prep_minutes,
    cookMinutes: row.cook_minutes,
    ingredients: row.ingredients ?? [],
    steps: row.steps ?? [],
    tags: row.tags ?? [],
    collections: [],
    nutrition: row.nutrition ?? undefined,
    difficulty: row.difficulty ?? undefined,
    savedAt: ts,
    createdAt: ts,
    isSaved: false,
    isFamily: false,
  };
}
