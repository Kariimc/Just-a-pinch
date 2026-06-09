-- ── Profiles ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  avatar_uri TEXT,
  dietary_prefs TEXT[] NOT NULL DEFAULT '{}',
  skill_level TEXT NOT NULL DEFAULT 'confident',
  household_size INTEGER NOT NULL DEFAULT 2,
  prefer_metric BOOLEAN NOT NULL DEFAULT false,
  dark_mode BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Recipes ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recipes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_uri TEXT,
  image_color TEXT,
  servings INTEGER NOT NULL DEFAULT 4,
  prep_minutes INTEGER NOT NULL DEFAULT 0,
  cook_minutes INTEGER NOT NULL DEFAULT 0,
  ingredients JSONB NOT NULL DEFAULT '[]',
  steps JSONB NOT NULL DEFAULT '[]',
  tags TEXT[] NOT NULL DEFAULT '{}',
  collections TEXT[] NOT NULL DEFAULT '{}',
  source_url TEXT,
  nutrition JSONB,
  notes TEXT,
  rating NUMERIC,
  cooked_count INTEGER NOT NULL DEFAULT 0,
  is_saved BOOLEAN NOT NULL DEFAULT false,
  is_family BOOLEAN NOT NULL DEFAULT false,
  difficulty TEXT,
  saved_at BIGINT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Meal plan ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meal_plan (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL,
  servings INTEGER NOT NULL DEFAULT 1
);

-- ── Shopping items ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shopping_items (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Other',
  checked BOOLEAN NOT NULL DEFAULT false,
  recipe_ids TEXT[] NOT NULL DEFAULT '{}',
  is_manual BOOLEAN NOT NULL DEFAULT false
);

-- ── Row Level Security ─────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_own" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "recipes_own" ON public.recipes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "meal_plan_own" ON public.meal_plan FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "shopping_items_own" ON public.shopping_items FOR ALL USING (auth.uid() = user_id);

-- ── Auto-create profile on sign-up ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Storage: recipe-images bucket ─────────────────────────────────────────────
-- Run this block in the Supabase SQL editor (storage schema is not in migrations):
--
--   INSERT INTO storage.buckets (id, name, public)
--   VALUES ('recipe-images', 'recipe-images', true)
--   ON CONFLICT (id) DO NOTHING;
--
--   CREATE POLICY "recipe_images_own_insert" ON storage.objects
--     FOR INSERT WITH CHECK (bucket_id = 'recipe-images' AND auth.uid()::text = (storage.foldername(name))[1]);
--
--   CREATE POLICY "recipe_images_own_select" ON storage.objects
--     FOR SELECT USING (bucket_id = 'recipe-images');
--
--   CREATE POLICY "recipe_images_own_delete" ON storage.objects
--     FOR DELETE USING (bucket_id = 'recipe-images' AND auth.uid()::text = (storage.foldername(name))[1]);
