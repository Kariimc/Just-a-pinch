-- Surname for the family-cookbook cover ("{last_name}'s Family Cookbook").
-- Kept separate from `name` (the first/display name used in greetings).
alter table public.profiles add column if not exists last_name text;
