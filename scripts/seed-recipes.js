#!/usr/bin/env node
// Daily recipe seeder — calls Gemini 2.0 Flash Lite, inserts into featured_recipes via Supabase REST.
// Requires env: GEMINI_API_KEY, SUPABASE_SERVICE_ROLE_KEY
// Optional env: SUPABASE_URL (defaults to project URL)

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qdlfiewspjgbucszezja.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!GEMINI_KEY || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required env vars: GEMINI_API_KEY and/or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const today = new Date().toISOString().split('T')[0];
const month = new Date().toLocaleDateString('en-US', { month: 'long' });

// One slot per API call — keeps per-request token count low and ensures variety.
const RECIPE_SLOTS = [
  'a hearty dinner (any cuisine)',
  'a quick breakfast or brunch dish',
  'a light lunch or fresh salad',
  'a comforting soup, stew, or one-pot meal',
  'a baked good, snack, or dessert',
  'an international or fusion dish from a non-Western cuisine',
];

function buildPrompt(slot) {
  return `Generate exactly 1 restaurant-quality recipe for a recipe app — specifically: ${slot}.
Today is ${today} (${month}). Make it seasonally appropriate.

Return a single JSON object with exactly this structure — no markdown fences, no extra text, just the raw JSON object:
{
  "title": "Recipe Name",
  "description": "One or two enticing sentences about this dish.",
  "servings": 4,
  "prepMinutes": 15,
  "cookMinutes": 30,
  "difficulty": "easy",
  "tags": ["dinner", "italian", "comfort"],
  "imageColor": "toast",
  "ingredients": [
    {"id": "i1", "quantity": "2", "unit": "cups", "name": "all-purpose flour"},
    {"id": "i2", "quantity": "1", "unit": "tbsp", "name": "olive oil"}
  ],
  "steps": [
    {"id": "s1", "number": 1, "text": "Detailed description of step one. At least two sentences."},
    {"id": "s2", "number": 2, "text": "Step two description.", "timerSeconds": 300}
  ],
  "nutrition": {"calories": 450, "carbs": 55, "protein": 22, "fat": 14}
}

Rules:
- difficulty: "easy" | "medium" | "hard"
- imageColor: pick from [toast, greens, berry, soup, bread, cream, tomato, choc, blue] — match the food visually (tomato=tomato dishes, greens=salads/veg, choc=chocolate/dark, soup=stews, bread=baked goods, toast=golden/pasta, cream=light dishes, berry=purple/beet, blue=seafood)
- tags: 2–5 from [breakfast, lunch, dinner, snack, baking, vegetarian, vegan, quick, family, comfort, italian, asian, mexican, mediterranean, healthy]
- ingredients: 5–14 items with realistic quantities and units (cups, tbsp, tsp, oz, g, ml, cloves, slices, etc.)
- steps: 4–10 steps, each at least 2 sentences; add timerSeconds for any step that has a timed cook/rest
- Return ONLY the JSON object`;
}

async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 2048 },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

function parseRecipe(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON object found in response:\n${raw.slice(0, 400)}`);
  try {
    return JSON.parse(match[0]);
  } catch (e) {
    throw new Error(`JSON parse error: ${e.message}\nRaw:\n${match[0].slice(0, 400)}`);
  }
}

function toRow(r, idx) {
  return {
    id: `f_${today.replace(/-/g, '')}_${idx}`,
    title: String(r.title ?? 'Untitled'),
    description: r.description ? String(r.description) : null,
    image_color: String(r.imageColor ?? 'toast'),
    servings: Number(r.servings) || 4,
    prep_minutes: Number(r.prepMinutes) || 0,
    cook_minutes: Number(r.cookMinutes) || 0,
    ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
    steps: Array.isArray(r.steps) ? r.steps : [],
    tags: Array.isArray(r.tags) ? r.tags : [],
    nutrition: r.nutrition && typeof r.nutrition === 'object' ? r.nutrition : null,
    difficulty: r.difficulty ?? 'medium',
    featured_date: today,
  };
}

async function insertRows(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/featured_recipes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase insert failed ${res.status}: ${err}`);
  }
}

async function deleteOldRecipes(keepDays = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - keepDays);
  const cutoffDate = cutoff.toISOString().split('T')[0];

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/featured_recipes?featured_date=lt.${cutoffDate}`,
    {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  if (!res.ok) console.warn(`Cleanup warning: ${res.status} ${await res.text()}`);
  else console.log(`Cleaned up recipes older than ${cutoffDate}`);
}

async function main() {
  console.log(`Seeding recipes for ${today} (${month})...`);

  const recipes = [];
  for (const [index, slot] of RECIPE_SLOTS.entries()) {
    console.log(`Generating recipe ${index + 1} of ${RECIPE_SLOTS.length}: ${slot}...`);
    const raw = await callGemini(buildPrompt(slot));
    const recipe = parseRecipe(raw);
    recipes.push(recipe);

    if (index < RECIPE_SLOTS.length - 1) {
      console.log(`Pausing 3 s before next request to stay within rate limits...`);
      await sleep(3000);
    }
  }

  console.log(`Parsed ${recipes.length} recipes`);

  const rows = recipes.map(toRow);
  await insertRows(rows);
  console.log(`✓ Inserted ${rows.length} featured recipes for ${today}`);

  await deleteOldRecipes(7);
}

main().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
