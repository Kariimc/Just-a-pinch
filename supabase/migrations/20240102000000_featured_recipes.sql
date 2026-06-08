-- Featured / editorial recipes — seeded daily by Gemini, readable by all users.
CREATE TABLE IF NOT EXISTS public.featured_recipes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_uri TEXT,
  image_color TEXT NOT NULL DEFAULT 'toast',
  servings INTEGER NOT NULL DEFAULT 4,
  prep_minutes INTEGER NOT NULL DEFAULT 0,
  cook_minutes INTEGER NOT NULL DEFAULT 0,
  ingredients JSONB NOT NULL DEFAULT '[]',
  steps JSONB NOT NULL DEFAULT '[]',
  tags TEXT[] NOT NULL DEFAULT '{}',
  nutrition JSONB,
  difficulty TEXT,
  featured_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.featured_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "featured_read_all" ON public.featured_recipes FOR SELECT USING (true);
