// Quantity parsing, scaling, unit conversion and aisle categorisation.

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8,
  '⅙': 1 / 6, '⅚': 5 / 6, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
};

// Parses "1", "1.5", "1/2", "1 1/2", "1½", "½" → number, or null if not numeric.
export function parseQuantity(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;

  let total = 0;
  let matched = false;
  let rest = s;

  const whole = rest.match(/^(\d+(?:\.\d+)?)\s*/);
  if (whole) {
    total += parseFloat(whole[1]);
    matched = true;
    rest = rest.slice(whole[0].length);
  }

  const frac = rest.match(/^(\d+)\s*\/\s*(\d+)/);
  if (frac && Number(frac[2]) !== 0) {
    total += Number(frac[1]) / Number(frac[2]);
    matched = true;
    rest = rest.slice(frac[0].length);
  } else if (rest[0] && UNICODE_FRACTIONS[rest[0]] !== undefined) {
    total += UNICODE_FRACTIONS[rest[0]];
    matched = true;
  }

  return matched ? total : null;
}

const NICE_FRACTIONS: Array<[number, string]> = [
  [0.125, '⅛'], [0.25, '¼'], [1 / 3, '⅓'], [0.375, '⅜'], [0.5, '½'],
  [0.625, '⅝'], [2 / 3, '⅔'], [0.75, '¾'], [0.875, '⅞'],
];

export function formatQuantity(value: number): string {
  if (value <= 0) return '';
  const whole = Math.floor(value);
  const frac = value - whole;

  if (frac < 0.04) return String(whole);
  for (const [f, glyph] of NICE_FRACTIONS) {
    if (Math.abs(frac - f) < 0.04) return whole > 0 ? `${whole}${glyph}` : glyph;
  }
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export function scaleQuantity(qty: string, from: number, to: number): string {
  if (from === to) return qty;
  const num = parseQuantity(qty);
  if (num === null || from === 0) return qty;
  return formatQuantity((num * to) / from);
}

// ── Unit conversion (US ↔ metric) ─────────────────────────────────────────────

interface UnitDef {
  aliases: string[];
  metric: { factor: number; unit: string };
}

// factor converts ONE of this unit into the metric unit given.
const US_UNITS: UnitDef[] = [
  { aliases: ['cup', 'cups', 'c'], metric: { factor: 240, unit: 'ml' } },
  { aliases: ['tablespoon', 'tablespoons', 'tbsp', 'tbs'], metric: { factor: 15, unit: 'ml' } },
  { aliases: ['teaspoon', 'teaspoons', 'tsp'], metric: { factor: 5, unit: 'ml' } },
  { aliases: ['fluid ounce', 'fluid ounces', 'fl oz', 'floz'], metric: { factor: 30, unit: 'ml' } },
  { aliases: ['ounce', 'ounces', 'oz'], metric: { factor: 28, unit: 'g' } },
  { aliases: ['pound', 'pounds', 'lb', 'lbs'], metric: { factor: 454, unit: 'g' } },
  { aliases: ['pint', 'pints', 'pt'], metric: { factor: 473, unit: 'ml' } },
  { aliases: ['quart', 'quarts', 'qt'], metric: { factor: 946, unit: 'ml' } },
  { aliases: ['gallon', 'gallons', 'gal'], metric: { factor: 3785, unit: 'ml' } },
];

// Converts a quantity+unit for display. Returns the input unchanged when the
// unit isn't convertible (counts, pinches, metric already, etc).
export function convertUnits(
  qty: string,
  unit: string,
  to: 'us' | 'metric',
): { qty: string; unit: string } {
  if (to === 'us') return { qty, unit }; // recipes are stored in their source units
  const amount = parseQuantity(qty);
  if (amount === null) return { qty, unit };

  const normalized = unit.trim().toLowerCase().replace(/\.$/, '');
  const def = US_UNITS.find(u => u.aliases.includes(normalized));
  if (!def) return { qty, unit };

  let value = amount * def.metric.factor;
  let outUnit = def.metric.unit;
  if (value >= 1000) {
    value = value / 1000;
    outUnit = outUnit === 'ml' ? 'L' : 'kg';
  }
  const rounded = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return { qty: String(rounded), unit: outUnit };
}

// ── Shopping aisle categorisation ─────────────────────────────────────────────

const AISLES: Array<{ category: string; keywords: string[] }> = [
  {
    category: 'Produce',
    keywords: [
      'onion', 'garlic', 'tomato', 'potato', 'carrot', 'celery', 'pepper', 'chili',
      'lettuce', 'spinach', 'kale', 'arugula', 'cabbage', 'broccoli', 'cauliflower',
      'zucchini', 'squash', 'cucumber', 'mushroom', 'avocado', 'lemon', 'lime',
      'orange', 'apple', 'banana', 'berry', 'berries', 'grape', 'mango', 'peach',
      'pear', 'cilantro', 'parsley', 'basil', 'mint', 'thyme', 'rosemary', 'dill',
      'ginger', 'scallion', 'shallot', 'leek', 'corn', 'pea', 'green bean', 'herb',
    ],
  },
  {
    category: 'Dairy & eggs',
    keywords: [
      'milk', 'butter', 'cheese', 'cheddar', 'mozzarella', 'parmesan', 'feta',
      'yogurt', 'yoghurt', 'cream', 'sour cream', 'egg', 'eggs', 'ricotta', 'ghee',
    ],
  },
  {
    category: 'Meat & fish',
    keywords: [
      'chicken', 'beef', 'pork', 'lamb', 'turkey', 'bacon', 'sausage', 'ham',
      'steak', 'ground', 'mince', 'salmon', 'tuna', 'shrimp', 'prawn', 'cod',
      'fish', 'anchov', 'duck', 'chorizo', 'prosciutto',
    ],
  },
  {
    category: 'Bakery',
    keywords: ['bread', 'baguette', 'bun', 'roll', 'tortilla', 'pita', 'naan', 'croissant', 'bagel'],
  },
  {
    category: 'Pantry',
    keywords: [
      'flour', 'sugar', 'salt', 'oil', 'olive oil', 'vinegar', 'rice', 'pasta',
      'noodle', 'bean', 'lentil', 'chickpea', 'stock', 'broth', 'sauce', 'paste',
      'canned', 'spice', 'cumin', 'paprika', 'oregano', 'cinnamon', 'vanilla',
      'honey', 'syrup', 'oat', 'quinoa', 'baking', 'yeast', 'cocoa', 'chocolate',
      'nut', 'almond', 'walnut', 'peanut', 'sesame', 'soy', 'mustard', 'ketchup',
      'mayo', 'wine', 'breadcrumb',
    ],
  },
];

export function categorizeIngredient(name: string): string {
  const n = name.toLowerCase();
  for (const aisle of AISLES) {
    if (aisle.keywords.some(k => n.includes(k))) return aisle.category;
  }
  return 'Other';
}
