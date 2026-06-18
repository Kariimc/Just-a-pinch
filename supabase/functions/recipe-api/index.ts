// Recipe API — the four capture endpoints (URL import, text parse, photo OCR,
// AI generation), ported from backend/server.js so the app talks HTTPS straight
// to Supabase with no separately-hosted backend. Calls Claude directly using
// the project-wide ANTHROPIC_API_KEY secret (shared with claude-proxy).
//
// Also hosts the Instacart integration: `instacartLink` turns the shopping
// list into an Instacart shopping-list page URL via the Instacart Developer
// Platform API (INSTACART_API_KEY secret; set INSTACART_ENV=development to
// hit the sandbox host while using a dev key).
//
// Recipes with no photo of their own (AI-generated, pasted, scanned) get a
// real food photograph from Pexels keyed off the dish name (PEXELS_API_KEY
// secret — free; when unset the app falls back to the gradient placeholder).
//
// Request: POST { action: 'importUrl'|'parseText'|'ocr'|'generate'|'instacartLink', ...payload }
// Response: recipe JSON matching mobile/src/services/api.ts ImportResult,
// { url } for instacartLink, or { error: string } with a non-2xx status.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const MODEL = 'claude-haiku-4-5-20251001';

// Free AI captures per user per month. Premium users (profiles.ai_unlimited)
// are counted but never blocked — the RevenueCat webhook flips that flag.
const FREE_MONTHLY_AI_LIMIT = 3;

const INSTACART_KEY = Deno.env.get('INSTACART_API_KEY') ?? '';
const INSTACART_HOST = Deno.env.get('INSTACART_ENV') === 'development'
  ? 'https://connect.dev.instacart.tools'
  : 'https://connect.instacart.com';

// Stock food photography for recipes with no image of their own (AI-generated,
// pasted text, scanned cards). Free Pexels key — optional; absent → gradient.
const PEXELS_KEY = Deno.env.get('PEXELS_API_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const body = await req.json();

    // parseText/ocr/generate always need the model. importUrl tries structured
    // JSON-LD first and only needs the key as a fallback (checked inside), so
    // it isn't gated here — well-marked-up sites import with no AI key at all.
    if ((body.action === 'parseText' || body.action === 'ocr' || body.action === 'generate') && !ANTHROPIC_KEY) {
      console.error('ANTHROPIC_API_KEY secret is not set');
      return json({ error: 'AI is not set up yet — add the ANTHROPIC_API_KEY secret in Supabase → Edge Functions → Secrets.' }, 503);
    }

    switch (body.action) {
      case 'importUrl': return await importUrl(req, body.url);
      case 'parseText': return await parseText(req, body.text);
      case 'ocr': return await ocr(req, body.image);
      case 'generate': return await generate(req, body.prompt, body.constraints);
      case 'instacartLink': return await instacartLink(body.items, body.title);
      case 'foodPhoto': return await foodPhoto(body.title, body.tags);
      default: return json({ error: `Unknown action: ${body.action}` }, 400);
    }
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    console.error('recipe-api error:', msg);
    return json({ error: msg }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// ── AI usage metering ───────────────────────────────────────────────────────────
// Counts and caps AI captures per signed-in user via the consume_ai_credit
// Postgres function (atomic, behind RLS). Returns a 4xx Response to short-circuit
// the caller, or null to proceed. Consumes one credit per call, so invoke it
// exactly once — immediately before the Claude request, after any cheaper
// non-AI path (e.g. JSON-LD import) has been ruled out.
async function gateAi(req: Request): Promise<Response | null> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    if (!supabaseUrl || !anonKey) return null; // misconfigured — fail open

    // Forward the caller's JWT so auth.uid() resolves to them inside the RPC.
    const authHeader = req.headers.get('Authorization') ?? `Bearer ${anonKey}`;
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data, error } = await client.rpc('consume_ai_credit', { p_limit: FREE_MONTHLY_AI_LIMIT });
    if (error) {
      // A metering outage shouldn't break capture — fail open (cost is bounded).
      console.error('ai metering rpc error:', error.message);
      return null;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row || row.status === 'ok') return null;
    if (row.status === 'no_user') {
      // AI requires an account so usage can be metered; everything else (manual
      // entry, JSON-LD import, cooking) still works signed-out.
      return json({ error: 'Create a free account to use AI capture.', code: 'auth_required' }, 401);
    }
    return json({
      error: `You've used your ${FREE_MONTHLY_AI_LIMIT} free AI captures this month. Upgrade to Premium for unlimited.`,
      code: 'ai_limit',
    }, 402);
  } catch (e) {
    console.error('ai metering failed:', (e as Error)?.message);
    return null; // fail open
  }
}

// ── Claude ────────────────────────────────────────────────────────────────────

async function callClaude(system: string, user: string, imageBase64?: string): Promise<string> {
  const content = imageBase64
    ? [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 },
        },
        { type: 'text', text: user },
      ]
    : user;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error('Anthropic error:', res.status, detail);
    throw new Error(`AI service error (${res.status}). Please try again.`);
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

function parseRecipeJSON(raw: string): Record<string, unknown> {
  const match = raw.match(/```json\n?([\s\S]*?)\n?```/) ?? raw.match(/(\{[\s\S]*\})/);
  if (!match) throw new Error('No JSON found in AI response');
  return JSON.parse(match[1]);
}

// ── Stock food photo (Pexels) ──────────────────────────────────────────────────
// Finds a real food photograph for a recipe that has no image of its own. Tries
// the dish title first, then a tag, then a generic term — first hit wins. Any
// failure (no key, rate limit, no match) returns undefined so the caller falls
// back to the colored gradient placeholder; it never blocks or throws.
async function fetchFoodPhoto(title?: unknown, tags?: unknown): Promise<string | undefined> {
  if (!PEXELS_KEY) return undefined;

  const tag = Array.isArray(tags) ? tags.find(t => typeof t === 'string' && t.trim()) : undefined;
  const queries = [
    typeof title === 'string' && title.trim() ? title.trim() : '',
    tag ? `${tag} food` : '',
    'plated food dish',
  ].filter(Boolean);

  for (const q of queries) {
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=1&orientation=landscape&size=medium`,
        { headers: { Authorization: PEXELS_KEY } },
      );
      if (!res.ok) {
        console.error('Pexels error:', res.status);
        return undefined; // bad key / rate limit — stop, use gradient
      }
      const data = await res.json();
      const src = data.photos?.[0]?.src;
      if (src) return src.landscape ?? src.large ?? src.medium;
    } catch (e) {
      console.error('Pexels fetch failed:', (e as Error)?.message);
      return undefined;
    }
  }
  return undefined;
}

// Stand-alone photo lookup (no AI, no metering) so the app can back-fill cover
// photos for recipes saved without one. Always 200s with { imageUrl } — the
// value is undefined when nothing matches or PEXELS_API_KEY is unset.
async function foodPhoto(title?: unknown, tags?: unknown) {
  const imageUrl = await fetchFoodPhoto(title, tags);
  return json({ imageUrl });
}

// ── Instacart ─────────────────────────────────────────────────────────────────

interface InstacartItem { name: string; quantity?: string; unit?: string }

// "1 1/2" → 1.5, "3/4" → 0.75, "2" → 2; anything unparseable → 1.
function parseQty(q?: string): number {
  if (!q) return 1;
  const s = q.trim();
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 1;
}

async function instacartLink(items?: InstacartItem[], title?: string) {
  if (!items?.length) return json({ error: 'items are required' }, 400);
  if (!INSTACART_KEY) {
    console.error('INSTACART_API_KEY secret is not set');
    return json({ error: 'Instacart is not connected yet — add the INSTACART_API_KEY secret in Supabase → Edge Functions → Secrets.' }, 503);
  }

  const line_items = items.slice(0, 100).map(i => ({
    name: i.name,
    quantity: parseQty(i.quantity),
    unit: i.unit?.trim().toLowerCase() || 'each',
    display_text: [i.quantity, i.unit, i.name].filter(Boolean).join(' ').trim() || i.name,
  }));

  const res = await fetch(`${INSTACART_HOST}/idp/v1/products/products_link`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${INSTACART_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      title: title || 'Just a Pinch shopping list',
      link_type: 'shopping_list',
      expires_in: 30,
      line_items,
      landing_page_configuration: { enable_pantry_items: true },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error('Instacart error:', res.status, detail);
    return json({ error: `Instacart error (${res.status}). Please try again.` }, 502);
  }
  const data = await res.json();
  return json({ url: data.products_link_url });
}

// ── HTML helpers (regex-based; no DOM dependency in the edge runtime) ────────

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(nav|header|footer|aside)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 9000);
}

// Best image for a recipe page, smartest source first:
//   1. schema.org Recipe JSON-LD `image` — the actual dish, high-res, on
//      virtually every real recipe site (AllRecipes, NYT Cooking, etc.)
//   2. og:image  3. twitter:image  4. <link rel="image_src">
// Returns an absolute URL (relative/protocol-relative refs are resolved
// against the page URL), or undefined so the caller can fall back to Pexels.
function extractImage(html: string, pageUrl: string): string | undefined {
  const candidate =
    imageFromJsonLd(html) ??
    metaContent(html, 'og:image') ??
    metaContent(html, 'og:image:url') ??
    metaContent(html, 'og:image:secure_url') ??
    metaContent(html, 'twitter:image') ??
    metaContent(html, 'twitter:image:src') ??
    linkHref(html, 'image_src');
  if (!candidate) return undefined;
  try {
    return new URL(candidate, pageUrl).href;
  } catch {
    return candidate;
  }
}

// <meta property|name="key" content="..."> in either attribute order.
function metaContent(html: string, key: string): string | undefined {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, 'i');
  const tag = html.match(re)?.[0];
  const val = tag?.match(/content=["']([^"']+)["']/i)?.[1];
  return val ? decodeEntities(val) : undefined;
}

// <link rel="key" href="...">
function linkHref(html: string, rel: string): string | undefined {
  const re = new RegExp(`<link[^>]+rel=["']${rel}["'][^>]*>`, 'i');
  const tag = html.match(re)?.[0];
  const val = tag?.match(/href=["']([^"']+)["']/i)?.[1];
  return val ? decodeEntities(val) : undefined;
}

function decodeEntities(s: string): string {
  return s.replace(/&amp;/gi, '&').replace(/&#x2F;/gi, '/').replace(/&#47;/g, '/').trim();
}

// Pull the dish image out of any schema.org Recipe node (handles a top-level
// object, an array, or an @graph; image as a string, array, or ImageObject).
function imageFromJsonLd(html: string): string | undefined {
  const blocks = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const m of blocks) {
    let data: unknown;
    try { data = JSON.parse(m[1].trim()); } catch { continue; }
    const recipe = findRecipeNode(data);
    const img = recipe && pickImageValue((recipe as Record<string, unknown>).image);
    if (img) return img;
  }
  return undefined;
}

function findRecipeNode(data: unknown): Record<string, unknown> | undefined {
  const nodes = Array.isArray(data) ? data : [data];
  for (const n of nodes) {
    if (!n || typeof n !== 'object') continue;
    const obj = n as Record<string, unknown>;
    if (Array.isArray(obj['@graph'])) {
      const found = findRecipeNode(obj['@graph']);
      if (found) return found;
    }
    const type = obj['@type'];
    const isRecipe = Array.isArray(type)
      ? type.some(t => String(t).toLowerCase() === 'recipe')
      : String(type).toLowerCase() === 'recipe';
    if (isRecipe) return obj;
  }
  return undefined;
}

function pickImageValue(image: unknown): string | undefined {
  if (typeof image === 'string') return image.trim() || undefined;
  if (Array.isArray(image)) {
    for (const it of image) {
      const v = pickImageValue(it);
      if (v) return v;
    }
    return undefined;
  }
  if (image && typeof image === 'object') {
    const url = (image as Record<string, unknown>).url;
    return typeof url === 'string' ? url.trim() || undefined : undefined;
  }
  return undefined;
}

// ── Structured recipe (schema.org JSON-LD fast path) ────────────────────────────
// Parse a complete recipe straight from a page's Recipe structured data. Most
// real recipe sites embed it, so this imports without an AI call — faster, more
// accurate, and working even when no ANTHROPIC_API_KEY is set. Returns null when
// the page has no Recipe node with both ingredients and steps.

interface ParsedRecipe {
  title: string;
  description?: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  ingredients: Array<{ quantity: string; unit: string; name: string }>;
  steps: Array<{ number: number; text: string }>;
  tags: string[];
}

const UNITS = new Set([
  'cup', 'cups', 'tablespoon', 'tablespoons', 'tbsp', 'tbs', 'teaspoon', 'teaspoons', 'tsp',
  'ounce', 'ounces', 'oz', 'pound', 'pounds', 'lb', 'lbs', 'gram', 'grams', 'g',
  'kilogram', 'kilograms', 'kg', 'milliliter', 'milliliters', 'ml', 'liter', 'liters', 'l',
  'pinch', 'pinches', 'clove', 'cloves', 'can', 'cans', 'package', 'packages', 'pkg',
  'stick', 'sticks', 'slice', 'slices', 'quart', 'quarts', 'pint', 'pints', 'gallon', 'gallons',
  'sprig', 'sprigs', 'bunch', 'bunches', 'handful', 'dash', 'dashes', 'piece', 'pieces',
]);

const FRACTIONS: Record<string, string> = {
  '½': '1/2', '¼': '1/4', '¾': '3/4', '⅓': '1/3', '⅔': '2/3',
  '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
};

// First non-empty string from a value that may be a string or an array.
function str(v: unknown): string | undefined {
  if (typeof v === 'string') return v.trim() || undefined;
  if (Array.isArray(v)) { for (const x of v) { const s = str(x); if (s) return s; } }
  return undefined;
}

// ISO 8601 duration → minutes. Splits on 'T' so the date-part 'M' (months) is
// never confused with the time-part 'M' (minutes). PT1H30M → 90, PT45M → 45.
function isoToMin(v: unknown): number {
  const s = str(v);
  if (!s) return 0;
  const [datePart, timePart = ''] = s.toUpperCase().split('T');
  const d = Number(datePart.match(/(\d+)D/)?.[1] ?? 0);
  const h = Number(timePart.match(/(\d+)H/)?.[1] ?? 0);
  const m = Number(timePart.match(/(\d+)M/)?.[1] ?? 0);
  return d * 1440 + h * 60 + m;
}

// recipeYield: 4 | "4" | "4 servings" | ["4", "4 servings"] → 4
function parseYield(v: unknown): number {
  if (typeof v === 'number') return Math.round(v);
  if (Array.isArray(v)) { for (const x of v) { const n = parseYield(x); if (n) return n; } return 0; }
  if (typeof v === 'string') { const m = v.match(/\d+/); return m ? Number(m[0]) : 0; }
  return 0;
}

// "1 1/2 cups flour" → { quantity: "1 1/2", unit: "cup", name: "flour" }.
// Heuristic and forgiving — anything unmatched stays in name for the user to fix.
function splitIngredient(line: string): { quantity: string; unit: string; name: string } {
  let s = line.replace(/[½¼¾⅓⅔⅛⅜⅝⅞]/g, c => ' ' + FRACTIONS[c]).replace(/\s+/g, ' ').trim();
  const raw = s;

  let quantity = '';
  const qm = s.match(/^((?:\d+\s+\d+\/\d+)|(?:\d+\/\d+)|(?:\d+(?:\.\d+)?(?:\s*[-–to]+\s*\d+(?:\.\d+)?)?))\s*/i);
  if (qm) { quantity = qm[1].replace(/\s*[–-]\s*/, '-').replace(/\s+to\s+/i, '-').trim(); s = s.slice(qm[0].length); }

  let unit = '';
  const um = s.match(/^([a-zA-Z.]+)\b/);
  if (um) {
    const u = um[1].replace(/\.$/, '').toLowerCase();
    if (UNITS.has(u)) { unit = u; s = s.slice(um[0].length).trim(); }
  }
  s = s.replace(/^of\s+/i, '').trim();
  return { quantity, unit, name: s || raw };
}

function parseIngredients(v: unknown): Array<{ quantity: string; unit: string; name: string }> {
  if (!Array.isArray(v)) return [];
  return v.map(x => splitIngredient(str(x) ?? '')).filter(i => i.name);
}

// recipeInstructions: a blob string, an array of strings, HowToStep objects, or
// HowToSection objects with nested itemListElement. Flattened to ordered steps.
function parseInstructions(v: unknown): Array<{ number: number; text: string }> {
  let parts: string[] = [];
  if (typeof v === 'string') {
    parts = v.split(/\r?\n+|(?<=\.)\s+(?=[A-Z0-9])/);
  } else {
    const walk = (x: unknown) => {
      if (!x) return;
      if (typeof x === 'string') { parts.push(x); return; }
      if (Array.isArray(x)) { x.forEach(walk); return; }
      if (typeof x === 'object') {
        const o = x as Record<string, unknown>;
        if (o.itemListElement) { walk(o.itemListElement); return; }
        const t = str(o.text) ?? str(o.name);
        if (t) parts.push(t);
      }
    };
    walk(v);
  }
  return parts
    .map(p => p.trim())
    .filter(p => p.length > 2)
    .slice(0, 60)
    .map((text, i) => ({ number: i + 1, text }));
}

function parseKeywords(node: Record<string, unknown>): string[] {
  const tags = new Set<string>();
  const add = (v: unknown) => {
    if (typeof v === 'string') v.split(',').forEach(t => { const x = t.trim().toLowerCase(); if (x && x.length < 24) tags.add(x); });
    else if (Array.isArray(v)) v.forEach(add);
  };
  add(node.recipeCategory);
  add(node.recipeCuisine);
  add(node.keywords);
  return [...tags].slice(0, 8);
}

function recipeFromJsonLd(html: string): ParsedRecipe | null {
  const blocks = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const m of blocks) {
    let data: unknown;
    try { data = JSON.parse(m[1].trim()); } catch { continue; }
    const node = findRecipeNode(data);
    if (!node) continue;

    const title = str(node.name);
    const ingredients = parseIngredients(node.recipeIngredient);
    const steps = parseInstructions(node.recipeInstructions);
    if (!title || !ingredients.length || !steps.length) continue;

    const prep = isoToMin(node.prepTime);
    let cook = isoToMin(node.cookTime);
    const total = isoToMin(node.totalTime);
    if (!cook && total) cook = Math.max(total - prep, 0);

    return {
      title,
      description: str(node.description)?.slice(0, 600),
      servings: parseYield(node.recipeYield) || 4,
      prepMinutes: prep,
      cookMinutes: cook,
      ingredients,
      steps,
      tags: parseKeywords(node),
    };
  }
  return null;
}

// ── Actions ───────────────────────────────────────────────────────────────────

const RECIPE_SHAPE = `{
  "title": "string",
  "description": "string or null",
  "servings": number,
  "prepMinutes": number,
  "cookMinutes": number,
  "ingredients": [{"quantity":"string","unit":"string","name":"string","section":"string or null"}],
  "steps": [{"number":number,"text":"string","timerSeconds":number or null}],
  "tags": ["string"]
}`;

async function importUrl(req: Request, url?: string) {
  if (!url) return json({ error: 'url is required' }, 400);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let html: string;
  try {
    const page = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JustAPinchBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!page.ok) return json({ error: `Could not fetch that page (${page.status}).` }, 422);
    html = await page.text();
  } catch {
    return json({ error: 'Could not reach that URL. Check the link and try again.' }, 422);
  } finally {
    clearTimeout(timer);
  }

  const image = extractImage(html, url);

  // Fast path: a complete recipe straight from schema.org JSON-LD — no AI call.
  const structured = recipeFromJsonLd(html);
  if (structured) {
    const imageUrl = image ?? await fetchFoodPhoto(structured.title, structured.tags);
    return json({ ...structured, sourceUrl: url, imageUrl });
  }

  // No structured data — fall back to the model to read the page text.
  if (!ANTHROPIC_KEY) {
    return json({ error: "This page has no embedded recipe data, and AI parsing isn't set up. Add the ANTHROPIC_API_KEY secret to import from pages like this." }, 503);
  }

  // Only the AI fallback consumes a credit — the JSON-LD fast path above is free.
  const gate = await gateAi(req);
  if (gate) return gate;

  const pageText = htmlToText(html);
  const system = `You are a recipe parser. Extract the recipe from the provided page text and return ONLY valid JSON with this exact structure:
${RECIPE_SHAPE}
If you cannot find a value, use a sensible default. Return only JSON, no other text.`;

  const raw = await callClaude(system, `URL: ${url}\n\nPage text:\n${pageText}`);
  const recipe = parseRecipeJSON(raw);
  // Prefer the page's own photo (JSON-LD/og/twitter); else a stock food photo.
  const photo = image ?? await fetchFoodPhoto(recipe.title, recipe.tags);
  return json({ ...recipe, sourceUrl: url, imageUrl: photo });
}

async function parseText(req: Request, text?: string) {
  if (!text) return json({ error: 'text is required' }, 400);

  const gate = await gateAi(req);
  if (gate) return gate;

  const system = `You are a recipe parser. Parse the following text into a recipe and return ONLY valid JSON:
${RECIPE_SHAPE}`;

  const raw = await callClaude(system, text);
  const recipe = parseRecipeJSON(raw);
  const imageUrl = await fetchFoodPhoto(recipe.title, recipe.tags);
  return json({ ...recipe, imageUrl });
}

async function ocr(req: Request, image?: string) {
  if (!image) return json({ error: 'image is required' }, 400);

  const gate = await gateAi(req);
  if (gate) return gate;

  const system = `You are a recipe OCR assistant. The user has taken a photo of a handwritten or printed recipe.
Read all recipe text from the image and return ONLY valid JSON matching this structure:
{
  "title": "string",
  "description": "string or null",
  "servings": number,
  "prepMinutes": number,
  "cookMinutes": number,
  "ingredients": [{"quantity":"string","unit":"string","name":"string"}],
  "steps": [{"number":number,"text":"string"}],
  "tags": ["string"]
}
If a value is unreadable, use a sensible default. Return only JSON, no other text.`;

  const base64 = image.replace(/^data:image\/\w+;base64,/, '');
  const raw = await callClaude(system, 'Extract the recipe from this photo.', base64);
  const recipe = parseRecipeJSON(raw);
  // The scan is of the recipe card, not the dish — use a stock food photo.
  const imageUrl = await fetchFoodPhoto(recipe.title, recipe.tags);
  return json({ ...recipe, imageUrl });
}

async function generate(req: Request, prompt?: string, constraints?: Record<string, unknown>) {
  if (!prompt) return json({ error: 'prompt is required' }, 400);

  const gate = await gateAi(req);
  if (gate) return gate;

  const constraintText = [
    constraints?.servings ? `Serves: ${constraints.servings}` : '',
    constraints?.maxMinutes ? `Total time: ≤ ${constraints.maxMinutes} minutes` : '',
    constraints?.vegetarian ? 'Dietary: vegetarian' : '',
  ].filter(Boolean).join(', ');

  const system = `You are a creative recipe chef AI. Generate a complete recipe based on the user's description.
Return ONLY valid JSON with this exact structure:
{
  "title": "string",
  "description": "string",
  "servings": number,
  "prepMinutes": number,
  "cookMinutes": number,
  "ingredients": [{"quantity":"string","unit":"string","name":"string","section":"string or null"}],
  "steps": [{"number":number,"text":"string","timerSeconds":number or null}],
  "tags": ["string"],
  "nutrition": {"calories":number,"carbs":number,"protein":number,"fat":number}
}
Be creative but practical. Include realistic timing and accurate nutrition estimates.`;

  const userMsg = `Create a recipe for: ${prompt}${constraintText ? `\nConstraints: ${constraintText}` : ''}`;
  const raw = await callClaude(system, userMsg);
  const recipe = parseRecipeJSON(raw);
  const imageUrl = await fetchFoodPhoto(recipe.title, recipe.tags);
  return json({ ...recipe, imageUrl });
}
