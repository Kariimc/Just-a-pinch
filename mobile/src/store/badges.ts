import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconName } from '../components/Icon';
import { BadgeMetals } from '../theme';
import { getRecipes, getMealPlan, setStorageMutationListener } from './storage';
import { notifyBadgeUnlock } from '../lib/badgeUnlockBus';

// Badges are device-local (no Supabase table): most progress is derived live
// from recipe/plan data, so it follows the account wherever recipes sync.
// Only ephemeral actions (shopping check-offs, AI saves) keep cumulative
// counters here, bumped from the screens where the action happens.

export type BadgeMetal = Exclude<keyof typeof BadgeMetals, 'stone'>;

type DerivedStat =
  | 'recipesSaved'   // library size
  | 'urlImports'     // recipes with a sourceUrl
  | 'cooksFinished'  // sum of cookedCount (Cooking Mode finishes)
  | 'distinctCooked' // recipes cooked at least once
  | 'mealsPlanned';  // meal plan entries

export type CumulativeStat = 'itemsChecked' | 'aiGenerated';

type StatKey = DerivedStat | CumulativeStat | 'badgesEarned';

export interface BadgeDef {
  id: string;
  name: string;
  epithet: string; // short flavour line shown under the name
  goal: string;    // one-line goal, e.g. "Save 10 recipes"
  howTo: string;   // full explanation of how to earn it
  icon: IconName;
  metal: BadgeMetal;
  target: number;
  stat: StatKey;
}

export interface BadgeProgress extends BadgeDef {
  current: number;
  earned: boolean;
  earnedAt?: number;
  isNew: boolean; // earned but not yet celebrated on the Badges screen
}

export interface BadgeSummary {
  earnedCount: number;
  total: number;
  latest: BadgeProgress[]; // most recently earned, up to 3
}

// Display order: bronze starters → silver habits → gold mastery → the emerald set.
const CORE_BADGES: BadgeDef[] = [
  {
    id: 'first-pinch', name: 'First Pinch', metal: 'bronze', icon: 'bookmark',
    epithet: 'Every kitchen starts somewhere.',
    goal: 'Save your first recipe', target: 1, stat: 'recipesSaved',
    howTo: 'Tap the green + button and add a recipe any way you like — paste a link, snap a photo, paste text, write it yourself, or ask the AI. The moment it lands in your library, this badge is yours.',
  },
  {
    id: 'first-flame', name: 'First Flame', metal: 'bronze', icon: 'flame',
    epithet: 'The stove is lit.',
    goal: 'Finish your first cook', target: 1, stat: 'cooksFinished',
    howTo: 'Open any recipe, tap Start cooking, and follow Cooking Mode through to the last step. Tap "Finish cooking" at the end and the flame is yours.',
  },
  {
    id: 'week-ahead', name: 'Week Ahead', metal: 'bronze', icon: 'calendar',
    epithet: 'Future-you says thanks.',
    goal: 'Plan 7 meals', target: 7, stat: 'mealsPlanned',
    howTo: 'Open the Plan tab and drop recipes onto breakfasts, lunches and dinners. Once 7 meals are on your plan, the badge is yours.',
  },
  {
    id: 'web-forager', name: 'Web Forager', metal: 'bronze', icon: 'link',
    epithet: 'The internet is your cookbook.',
    goal: 'Import 3 recipes from links', target: 3, stat: 'urlImports',
    howTo: 'Found something tasty online? Tap +, choose to save from a link, and paste the URL — Just a Pinch pulls in the ingredients and steps for you. Import 3 recipes this way.',
  },
  {
    id: 'shelf-starter', name: 'Shelf Starter', metal: 'silver', icon: 'book',
    epithet: 'A proper shelf takes shape.',
    goal: 'Save 10 recipes', target: 10, stat: 'recipesSaved',
    howTo: 'Keep collecting: every recipe you save counts, whether it comes from a link, a photo, pasted text, the editor, or the AI generator. Reach 10 recipes in your library.',
  },
  {
    id: 'list-legend', name: 'List Legend', metal: 'silver', icon: 'cart',
    epithet: 'Aisle by aisle, unstoppable.',
    goal: 'Check off 25 shopping items', target: 25, stat: 'itemsChecked',
    howTo: 'Build a shopping list from your meal plan (or add items yourself) and tick items off as you shop. Every checked item counts toward 25, across as many trips as you need.',
  },
  {
    id: 'spark-of-genius', name: 'Spark of Genius', metal: 'silver', icon: 'sparkle',
    epithet: 'Conjured from a craving.',
    goal: 'Save 3 AI-generated recipes', target: 3, stat: 'aiGenerated',
    howTo: 'Open the AI generator from the + menu, describe what you’re craving — "cozy 30-minute pasta, vegetarian" — and save what it dreams up. Save 3 AI recipes to earn this.',
  },
  {
    id: 'the-explorer', name: 'The Explorer', metal: 'silver', icon: 'globe',
    epithet: 'No dish left unturned.',
    goal: 'Cook 5 different recipes', target: 5, stat: 'distinctCooked',
    howTo: 'Variety is the secret ingredient. Finish 5 different recipes in Cooking Mode — new dishes, not repeats — to chart this one.',
  },
  {
    id: 'seasoned-hand', name: 'Seasoned Hand', metal: 'silver', icon: 'flame',
    epithet: 'Practice you can taste.',
    goal: 'Finish 10 cooks', target: 10, stat: 'cooksFinished',
    howTo: 'Every time you finish a recipe in Cooking Mode it counts as one cook — repeats included. Stack up 10 finished cooks.',
  },
  {
    id: 'the-archivist', name: 'The Archivist', metal: 'gold', icon: 'grid',
    epithet: 'Keeper of the family canon.',
    goal: 'Save 25 recipes', target: 25, stat: 'recipesSaved',
    howTo: 'Grow your library to 25 saved recipes. Imports, photos, AI creations and hand-written classics all count — this is the collector’s crown.',
  },
  {
    id: 'pinch-master', name: 'Pinch Master', metal: 'gold', icon: 'chefhat',
    epithet: 'The kitchen answers to you.',
    goal: 'Finish 25 cooks', target: 25, stat: 'cooksFinished',
    howTo: 'The long game: 25 finished cooks in Cooking Mode. Weeknight repeats count, so keep showing up to the stove.',
  },
];

export const BADGES: BadgeDef[] = [
  ...CORE_BADGES,
  {
    id: 'full-plate', name: 'Full Plate', metal: 'emerald', icon: 'plate',
    epithet: 'The complete collection.',
    goal: 'Earn every other badge', target: CORE_BADGES.length, stat: 'badgesEarned',
    howTo: `The rarest pinch of all: earn all ${CORE_BADGES.length} other badges and this emerald seals the set.`,
  },
];

const COUNTERS_KEY = '@jap_badge_counters';
const EARNED_KEY = '@jap_badges_earned';

interface EarnedEntry {
  earnedAt: number;
  celebrated: boolean;
  // Unlock panel shown. Entries written before the panel existed lack the
  // field and are treated as already announced, so upgrades stay quiet.
  notified?: boolean;
}

// Session guard: a recompute can run again before the AsyncStorage write
// lands, and the panel must never pop twice for one badge.
const announced = new Set<string>();

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// Count an ephemeral action toward its badge. Never throws — a failed count
// must never block the action the user just took.
export async function bumpBadgeStat(stat: CumulativeStat, by = 1): Promise<void> {
  try {
    const counters = await readJson<Partial<Record<CumulativeStat, number>>>(COUNTERS_KEY, {});
    counters[stat] = (counters[stat] ?? 0) + by;
    await writeJson(COUNTERS_KEY, counters);
  } catch { /* ignore */ }
  scheduleBadgeCheck();
}

export async function getBadgeProgress(): Promise<BadgeProgress[]> {
  const [recipes, plan, counters, earnedMap] = await Promise.all([
    getRecipes(),
    getMealPlan(),
    readJson<Partial<Record<CumulativeStat, number>>>(COUNTERS_KEY, {}),
    readJson<Record<string, EarnedEntry>>(EARNED_KEY, {}),
  ]);

  const stats: Record<Exclude<StatKey, 'badgesEarned'>, number> = {
    recipesSaved: recipes.length,
    urlImports: recipes.filter(r => !!r.sourceUrl).length,
    cooksFinished: recipes.reduce((n, r) => n + (r.cookedCount ?? 0), 0),
    distinctCooked: recipes.filter(r => (r.cookedCount ?? 0) > 0).length,
    mealsPlanned: plan.length,
    itemsChecked: counters.itemsChecked ?? 0,
    aiGenerated: counters.aiGenerated ?? 0,
  };

  // Full Plate needs to know how many of the others are earned this pass.
  const earnedOthers = BADGES.filter(
    d => d.stat !== 'badgesEarned' && (earnedMap[d.id] || stats[d.stat] >= d.target),
  ).length;

  const now = Date.now();
  let dirty = false;

  const all = BADGES.map<BadgeProgress>(def => {
    const current = def.stat === 'badgesEarned' ? earnedOthers : stats[def.stat];
    // Once earned, always earned — deleting recipes never revokes a badge.
    const earned = !!earnedMap[def.id] || current >= def.target;
    if (earned && !earnedMap[def.id]) {
      // If a concurrent getBadgeProgress() call already announced this badge
      // (it's in the session-level `announced` set), mark it notified:true
      // immediately so this call's write doesn't overwrite it with false.
      earnedMap[def.id] = { earnedAt: now, celebrated: false, notified: announced.has(def.id) };
      dirty = true;
    }
    const entry = earnedMap[def.id];
    return {
      ...def,
      current: earned ? Math.max(current, def.target) : current,
      earned,
      earnedAt: entry?.earnedAt,
      isNew: !!entry && !entry.celebrated,
    };
  });

  // Collect fresh unlocks — persist before notifying so a restart never
  // re-shows a panel the user already saw (or missed due to a crash).
  const toAnnounce: BadgeProgress[] = [];
  for (const b of all) {
    const entry = earnedMap[b.id];
    if (entry?.notified === false && !announced.has(b.id)) {
      announced.add(b.id);
      entry.notified = true;
      dirty = true;
      toAnnounce.push(b);
    }
  }

  if (dirty) {
    try { await writeJson(EARNED_KEY, earnedMap); } catch { /* ignore */ }
  }

  for (const b of toAnnounce) {
    notifyBadgeUnlock(b);
  }

  return all;
}

// Debounced recompute so a badge earned mid-action pops its unlock panel
// right away instead of waiting for the user to visit a badge surface.
let checkTimer: ReturnType<typeof setTimeout> | null = null;
export function scheduleBadgeCheck(): void {
  if (checkTimer) clearTimeout(checkTimer);
  checkTimer = setTimeout(() => {
    checkTimer = null;
    getBadgeProgress().catch(() => {});
  }, 500);
}

// Recipe saves (covers imports, AI saves and cook finishes) and meal-plan
// writes all advance derived stats — recheck after each.
setStorageMutationListener(scheduleBadgeCheck);

export async function markBadgesCelebrated(ids: string[]): Promise<void> {
  try {
    const earnedMap = await readJson<Record<string, EarnedEntry>>(EARNED_KEY, {});
    for (const id of ids) {
      if (earnedMap[id]) earnedMap[id].celebrated = true;
    }
    await writeJson(EARNED_KEY, earnedMap);
  } catch { /* ignore */ }
}

export async function getBadgeSummary(): Promise<BadgeSummary> {
  const all = await getBadgeProgress();
  const earned = all
    .filter(b => b.earned)
    .sort((a, b) => (b.earnedAt ?? 0) - (a.earnedAt ?? 0));
  return { earnedCount: earned.length, total: all.length, latest: earned.slice(0, 3) };
}
