// Capture endpoints (URL import, text parse, photo OCR, AI generation) run in
// the `recipe-api` Supabase edge function — HTTPS end to end, no self-hosted
// backend. supabase.functions.invoke attaches the anon key automatically (and
// the user's JWT when signed in), so this works signed-out too.

import { supabase } from '../lib/supabase';
import { NutritionInfo } from '../types';

interface ImportResult {
  title: string;
  description?: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  ingredients: Array<{ quantity: string; unit: string; name: string; section?: string }>;
  steps: Array<{ number: number; text: string; timerSeconds?: number }>;
  tags: string[];
  sourceUrl: string;
  imageUrl?: string;
  nutrition?: NutritionInfo;
}

async function invokeRecipeApi<T>(payload: Record<string, unknown>, fallbackError: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke('recipe-api', { body: payload });
  if (error) {
    // FunctionsHttpError carries the server response — surface its message.
    let message = fallbackError;
    try {
      const ctx = await (error as { context?: Response }).context?.json();
      if (ctx?.error) message = String(ctx.error);
    } catch { /* keep fallback */ }
    throw new Error(message);
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

export async function importFromUrl(url: string): Promise<ImportResult> {
  return invokeRecipeApi<ImportResult>({ action: 'importUrl', url }, 'Import failed');
}

export async function generateRecipeAI(prompt: string, constraints: Record<string, unknown>): Promise<ImportResult> {
  return invokeRecipeApi<ImportResult>({ action: 'generate', prompt, constraints }, 'Generation failed');
}

export async function ocrImage(base64: string): Promise<Partial<ImportResult>> {
  return invokeRecipeApi<Partial<ImportResult>>({ action: 'ocr', image: base64 }, 'OCR failed');
}

export async function parseTextRecipe(text: string): Promise<Partial<ImportResult>> {
  return invokeRecipeApi<Partial<ImportResult>>({ action: 'parseText', text }, 'Parse failed');
}

// Creates an Instacart shopping-list page from the items and returns its URL.
// Opening it lands the user in the Instacart app/site with every item matched
// to real products, one tap from the cart.
export async function createInstacartLink(
  items: Array<{ name: string; quantity?: string; unit?: string }>,
  title?: string,
): Promise<string> {
  const { url } = await invokeRecipeApi<{ url: string }>(
    { action: 'instacartLink', items, title },
    'Could not build the Instacart cart',
  );
  return url;
}
