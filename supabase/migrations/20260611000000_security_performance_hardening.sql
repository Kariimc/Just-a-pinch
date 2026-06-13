-- Security & performance fixes from Supabase advisors.

-- 1. Drop leftover tables from an earlier iteration: empty, unused by the app,
--    and carrying USING (true) policies that bypassed row security entirely.
DROP TABLE IF EXISTS public.user_recipes;
DROP TABLE IF EXISTS public.catalog_bookmarks;

-- 2. featured_recipes is seeded with the service role key, which bypasses RLS;
--    nobody else should be able to insert editorial content.
DROP POLICY IF EXISTS "featured_insert_service" ON public.featured_recipes;

-- 3. The signup trigger function should not be callable through the REST API.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;

-- 4. Wrap auth.uid() in a subselect so it's evaluated once per query, not per row.
DROP POLICY IF EXISTS "profiles_own" ON public.profiles;
CREATE POLICY "profiles_own" ON public.profiles FOR ALL
  USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "recipes_own" ON public.recipes;
CREATE POLICY "recipes_own" ON public.recipes FOR ALL
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "meal_plan_own" ON public.meal_plan;
CREATE POLICY "meal_plan_own" ON public.meal_plan FOR ALL
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "shopping_items_own" ON public.shopping_items;
CREATE POLICY "shopping_items_own" ON public.shopping_items FOR ALL
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- 5. Covering indexes for the user_id foreign keys (every app query filters on them).
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON public.recipes (user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_user_id ON public.meal_plan (user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_user_id ON public.shopping_items (user_id);
