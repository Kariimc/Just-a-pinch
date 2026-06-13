-- community_recipes: public recipe snapshots shared by users
CREATE TABLE IF NOT EXISTS public.community_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipe jsonb NOT NULL,
  author_name text NOT NULL DEFAULT '',
  shared_at timestamptz DEFAULT now() NOT NULL,
  avg_rating numeric(3,2) DEFAULT 0 NOT NULL,
  rating_count integer DEFAULT 0 NOT NULL
);

ALTER TABLE public.community_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_recipes_read" ON public.community_recipes
  FOR SELECT USING (true);

CREATE POLICY "community_recipes_insert" ON public.community_recipes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "community_recipes_delete" ON public.community_recipes
  FOR DELETE USING (auth.uid() = user_id);

-- community_ratings: one row per (user, shared_recipe), 1-5 stars
CREATE TABLE IF NOT EXISTS public.community_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  community_recipe_id uuid REFERENCES public.community_recipes(id) ON DELETE CASCADE NOT NULL,
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  rated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, community_recipe_id)
);

ALTER TABLE public.community_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_ratings_read" ON public.community_ratings
  FOR SELECT USING (true);

CREATE POLICY "community_ratings_insert" ON public.community_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "community_ratings_update" ON public.community_ratings
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "community_ratings_delete" ON public.community_ratings
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger to keep avg_rating/rating_count in sync
CREATE OR REPLACE FUNCTION public.sync_recipe_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_id uuid;
BEGIN
  target_id := COALESCE(NEW.community_recipe_id, OLD.community_recipe_id);
  UPDATE community_recipes
  SET
    avg_rating = (
      SELECT COALESCE(ROUND(AVG(stars::numeric), 2), 0)
      FROM community_ratings WHERE community_recipe_id = target_id
    ),
    rating_count = (
      SELECT COUNT(*) FROM community_ratings WHERE community_recipe_id = target_id
    )
  WHERE id = target_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_recipe_rating
AFTER INSERT OR UPDATE OR DELETE ON public.community_ratings
FOR EACH ROW EXECUTE FUNCTION public.sync_recipe_rating();

-- Weekly top-10 view
CREATE OR REPLACE VIEW public.community_top10_week AS
SELECT *
FROM public.community_recipes
WHERE shared_at >= now() - interval '7 days'
ORDER BY avg_rating DESC, rating_count DESC, shared_at DESC
LIMIT 10;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_community_recipes_shared_at
  ON public.community_recipes (shared_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_recipes_rating
  ON public.community_recipes (avg_rating DESC, rating_count DESC);
CREATE INDEX IF NOT EXISTS idx_community_ratings_recipe
  ON public.community_ratings (community_recipe_id);
