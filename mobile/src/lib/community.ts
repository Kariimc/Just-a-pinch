import { supabase } from './supabase';
import { Recipe } from '../types';

export interface CommunityRecipe {
  id: string;
  userId: string;
  recipe: Recipe;
  authorName: string;
  sharedAt: number;
  avgRating: number;
  ratingCount: number;
}

function rowTo(row: Record<string, unknown>): CommunityRecipe {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    recipe: row.recipe as Recipe,
    authorName: row.author_name as string,
    sharedAt: new Date(row.shared_at as string).getTime(),
    avgRating: parseFloat(String(row.avg_rating)) || 0,
    ratingCount: (row.rating_count as number) || 0,
  };
}

export async function getTopWeekRecipes(): Promise<CommunityRecipe[]> {
  const { data, error } = await supabase
    .from('community_top10_week')
    .select('*');
  if (error) throw error;
  return (data ?? []).map(rowTo);
}

export async function getAllRecipes(page = 0): Promise<CommunityRecipe[]> {
  const { data, error } = await supabase
    .from('community_recipes')
    .select('*')
    .order('shared_at', { ascending: false })
    .range(page * 20, page * 20 + 19);
  if (error) throw error;
  return (data ?? []).map(rowTo);
}

export async function shareRecipe(recipe: Recipe, authorName: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in to share recipes');
  const { error } = await supabase
    .from('community_recipes')
    .insert({ user_id: user.id, recipe, author_name: authorName });
  if (error) throw error;
}

export async function rateRecipe(communityRecipeId: string, stars: number): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in to rate recipes');
  const { error } = await supabase
    .from('community_ratings')
    .upsert(
      { user_id: user.id, community_recipe_id: communityRecipeId, stars },
      { onConflict: 'user_id,community_recipe_id' },
    );
  if (error) throw error;
}

export async function getMyRatings(ids: string[]): Promise<Record<string, number>> {
  if (!ids.length) return {};
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};
  const { data } = await supabase
    .from('community_ratings')
    .select('community_recipe_id,stars')
    .eq('user_id', user.id)
    .in('community_recipe_id', ids);
  const map: Record<string, number> = {};
  for (const row of (data ?? [])) {
    const r = row as { community_recipe_id: string; stars: number };
    map[r.community_recipe_id] = r.stars;
  }
  return map;
}

export async function deleteSharedRecipe(id: string): Promise<void> {
  const { error } = await supabase.from('community_recipes').delete().eq('id', id);
  if (error) throw error;
}
