// Recipe API — the four capture endpoints (URL import, text parse, photo OCR,
// AI generation), ported from backend/server.js so the app talks HTTPS straight
// to Supabase with no separately-hosted backend. Calls Claude directly using
// the project-wide ANTHROPIC_API_KEY secret (shared with claude-proxy).
//
// Request: POST { action: 'importUrl'|'parseText'|'ocr'|'generate', ...payload }
// Response: recipe JSON matching mobile/src/services/api.ts ImportResult,
// or { error: string } with a non-2xx status.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const MODEL = 'claude-opus-4-8';

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
    switch (body.action) {
      case 'importUrl': return await importUrl(body.url);
      case 'parseText': return await parseText(body.text);
      case 'ocr': return await ocr(body.image);
      case 'generate': return await generate(body.prompt, body.constraints);
      default: return json({ error: `Unknown action: ${body.action}` }, 400);
    }
  } catch (err) {
    return json({ error: String((err as Error)?.message ?? err) }, 500);
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
    console.error('Anthropic error:', detail);
    throw new Error('The AI service is unavailable right now. Please try again.');
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

function parseRecipeJSON(raw: string): Record<string, unknown> {
  const match = raw.match(/```json\n?([\s\S]*?)\n?```/) ?? raw.match(/(\{[\s\S]*\})/);
  if (!match) throw new Error('No JSON found in AI response');
  return JSON.parse(match[1]);
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
