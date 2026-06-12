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
// Request: POST { action: 'importUrl'|'parseText'|'ocr'|'generate'|'instacartLink', ...payload }
// Response: recipe JSON matching mobile/src/services/api.ts ImportResult,
// { url } for instacartLink, or { error: string } with a non-2xx status.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const MODEL = 'claude-haiku-4-5-20251001';

const INSTACART_KEY = Deno.env.get('INSTACART_API_KEY') ?? '';
const INSTACART_HOST = Deno.env.get('INSTACART_ENV') === 'development'
  ? 'https://connect.dev.instacart.tools'
  : 'https://connect.instacart.com';

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

    if (body.action !== 'instacartLink' && !ANTHROPIC_KEY) {
      console.error('ANTHROPIC_API_KEY secret is not set');
      return json({ error: 'AI is not set up yet — add the ANTHROPIC_API_KEY secret in Supabase → Edge Functions → Secrets.' }, 503);
    }

    switch (body.action) {
      case 'importUrl': return await importUrl(body.url);
      case 'parseText': return await parseText(body.text);
      case 'ocr': return await ocr(body.image);
      case 'generate': return await generate(body.prompt, body.constraints);
      case 'instacartLink': return await instacartLink(body.items, body.title);
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

function extractOgImage(html: string): string | undefined {
  const tag =
    html.match(/<meta[^>]+property=["']og:image["'][^>]*>/i)?.[0] ??
    html.match(/<meta[^>]+name=["']og:image["'][^>]*>/i)?.[0];
  return tag?.match(/content=["']([^"']+)["']/i)?.[1] || undefined;
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

async function importUrl(url?: string) {
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

  const pageText = htmlToText(html);
  const imageUrl = extractOgImage(html);

  const system = `You are a recipe parser. Extract the recipe from the provided page text and return ONLY valid JSON with this exact structure:
${RECIPE_SHAPE}
If you cannot find a value, use a sensible default. Return only JSON, no other text.`;

  const raw = await callClaude(system, `URL: ${url}\n\nPage text:\n${pageText}`);
  const recipe = parseRecipeJSON(raw);
  return json({ ...recipe, sourceUrl: url, imageUrl });
}

async function parseText(text?: string) {
  if (!text) return json({ error: 'text is required' }, 400);

  const system = `You are a recipe parser. Parse the following text into a recipe and return ONLY valid JSON:
${RECIPE_SHAPE}`;

  const raw = await callClaude(system, text);
  return json(parseRecipeJSON(raw));
}

async function ocr(image?: string) {
  if (!image) return json({ error: 'image is required' }, 400);

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
  return json(parseRecipeJSON(raw));
}

async function generate(prompt?: string, constraints?: Record<string, unknown>) {
  if (!prompt) return json({ error: 'prompt is required' }, 400);

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
  return json(parseRecipeJSON(raw));
}
