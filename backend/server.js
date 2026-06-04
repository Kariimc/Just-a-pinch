require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const cheerio = require('cheerio');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── Supabase client (used for Edge Functions / AI calls) ────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_ANON_KEY ?? '',
);

// ── Utility: call Claude via Supabase Edge Function ─────────────────────────
async function callClaude(systemPrompt, userMessage) {
  const res = await supabase.functions.invoke('claude-proxy', {
    body: { system: systemPrompt, user: userMessage },
  });
  if (res.error) throw new Error(res.error.message ?? 'Supabase function error');
  return res.data?.content ?? '';
}

// ── Utility: parse recipe JSON out of a Claude response ─────────────────────
function parseRecipeJSON(raw) {
  const match = raw.match(/```json\n?([\s\S]*?)\n?```/) ?? raw.match(/(\{[\s\S]*\})/);
  if (!match) throw new Error('No JSON found in AI response');
  return JSON.parse(match[1]);
}

// ── POST /api/import/url ─────────────────────────────────────────────────────
app.post('/api/import/url', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });

  try {
    // 1. Fetch the page
    const { data: html } = await axios.get(url, {
      timeout: 12000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JustAPinchBot/1.0)' },
    });

    // 2. Extract text from the page
    const $ = cheerio.load(html);
    $('script, style, nav, header, footer, aside').remove();
    const pageText = $('body').text().replace(/\s+/g, ' ').slice(0, 8000);

    // 3. Find main image
    const imageUrl =
      $('meta[property="og:image"]').attr('content') ??
      $('img[class*="recipe"]').first().attr('src') ??
      $('article img').first().attr('src') ??
      undefined;

    // 4. Ask Claude to structure it
    const system = `You are a recipe parser. Extract the recipe from the provided page text and return ONLY valid JSON with this exact structure:
{
  "title": "string",
  "description": "string or null",
  "servings": number,
  "prepMinutes": number,
  "cookMinutes": number,
  "ingredients": [{"quantity":"string","unit":"string","name":"string","section":"string or null"}],
  "steps": [{"number":number,"text":"string","timerSeconds":number or null}],
  "tags": ["string"]
}
If you cannot find a value, use a sensible default. Return only JSON, no other text.`;

    const raw = await callClaude(system, `URL: ${url}\n\nPage text:\n${pageText}`);
    const recipe = parseRecipeJSON(raw);

    return res.json({ ...recipe, sourceUrl: url, imageUrl });
  } catch (err) {
    console.error('import/url error:', err.message);
    return res.status(500).json({ error: err.message ?? 'Failed to import recipe' });
  }
});

// ── POST /api/import/text ────────────────────────────────────────────────────
app.post('/api/import/text', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  try {
    const system = `You are a recipe parser. Parse the following text into a recipe and return ONLY valid JSON:
{
  "title": "string",
  "description": "string or null",
  "servings": number,
  "prepMinutes": number,
  "cookMinutes": number,
  "ingredients": [{"quantity":"string","unit":"string","name":"string","section":"string or null"}],
  "steps": [{"number":number,"text":"string","timerSeconds":number or null}],
  "tags": ["string"]
}`;
    const raw = await callClaude(system, text);
    const recipe = parseRecipeJSON(raw);
    return res.json(recipe);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/import/ocr ─────────────────────────────────────────────────────
app.post('/api/import/ocr', async (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'image is required' });

  try {
    const system = `You are a recipe OCR assistant. The user has taken a photo of a handwritten or printed recipe.
Extract all recipe text from the image description and return ONLY valid JSON matching this structure:
{
  "title": "string",
  "description": "string or null",
  "servings": number,
  "prepMinutes": number,
  "cookMinutes": number,
  "ingredients": [{"quantity":"string","unit":"string","name":"string"}],
  "steps": [{"number":number,"text":"string"}],
  "tags": ["string"]
}`;
    // For OCR we pass the base64 image — the Supabase edge function handles vision
    const raw = await callClaude(system, `[IMAGE_BASE64]: ${image.slice(0, 100)}...`);
    const recipe = parseRecipeJSON(raw);
    return res.json(recipe);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/generate ────────────────────────────────────────────────────
app.post('/api/ai/generate', async (req, res) => {
  const { prompt, constraints } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  try {
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
    return res.json(recipe);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Just a Pinch backend running on http://0.0.0.0:${PORT}`);
});
