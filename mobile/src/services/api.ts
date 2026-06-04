// All API calls go through the local backend so keys never touch the phone.
// In development (Expo Go) the backend runs on your machine; update BASE_URL
// to your machine's LAN IP so the Android device can reach it.
// e.g. http://192.168.1.42:3001

import Constants from 'expo-constants';

// Read from app.json extra, fall back to localhost
const BASE_URL: string =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'http://localhost:3001';

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
}

export async function importFromUrl(url: string): Promise<ImportResult> {
  const res = await fetch(`${BASE_URL}/api/import/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Import failed');
  }
  return res.json();
}

export async function generateRecipeAI(prompt: string, constraints: Record<string, unknown>): Promise<ImportResult> {
  const res = await fetch(`${BASE_URL}/api/ai/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, constraints }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Generation failed');
  }
  return res.json();
}

export async function ocrImage(base64: string): Promise<Partial<ImportResult>> {
  const res = await fetch(`${BASE_URL}/api/import/ocr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64 }),
  });
  if (!res.ok) throw new Error('OCR failed');
  return res.json();
}

export async function parseTextRecipe(text: string): Promise<Partial<ImportResult>> {
  const res = await fetch(`${BASE_URL}/api/import/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Parse failed');
  return res.json();
}

export function getApiBaseUrl(): string {
  return BASE_URL;
}
