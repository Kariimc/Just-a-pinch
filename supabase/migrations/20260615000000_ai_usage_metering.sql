-- Server-side AI usage metering.
--
-- The free "N AI captures / month" cap was marketing copy only — the client
-- never enforced it and the edge function never checked, so AI capture was
-- effectively uncapped (a real cost leak and an unenforceable paywall). This
-- adds a per-user monthly counter plus a server-controlled premium flag, and an
-- atomic check-and-increment the recipe-api edge function calls before every
-- Claude request. Because it runs in Postgres behind RLS + a SECURITY DEFINER
-- function, the cap cannot be bypassed from the client.

-- Premium entitlement, controlled by the server (real IAP flips this when it
-- ships; until then it defaults false and everyone is on the metered free cap).
alter table public.profiles
  add column if not exists ai_unlimited boolean not null default false;

-- One row per user per UTC calendar month.
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null,                       -- UTC 'YYYY-MM'
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, period)
);

alter table public.ai_usage enable row level security;

-- Users may read their own usage (e.g. to show "N left"). All writes go through
-- consume_ai_credit() below — never directly — so there is no write policy.
drop policy if exists "ai_usage_read_own" on public.ai_usage;
create policy "ai_usage_read_own" on public.ai_usage
  for select using (auth.uid() = user_id);

-- Atomic check-and-increment for the caller's current month.
--   status 'ok'      -> allowed; a credit was consumed
--   status 'limit'   -> over quota; nothing changed
--   status 'no_user' -> no authenticated caller (anon/signed-out)
-- Premium users (profiles.ai_unlimited) are counted but never blocked.
create or replace function public.consume_ai_credit(p_limit integer)
returns table (status text, used integer, remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_period text := to_char((now() at time zone 'utc'), 'YYYY-MM');
  v_unlimited boolean;
  v_count integer;
begin
  if v_user is null then
    return query select 'no_user'::text, 0, 0;
    return;
  end if;

  select coalesce(ai_unlimited, false) into v_unlimited from profiles where id = v_user;

  if coalesce(v_unlimited, false) then
    insert into ai_usage (user_id, period, count)
      values (v_user, v_period, 1)
      on conflict (user_id, period)
        do update set count = ai_usage.count + 1, updated_at = now()
      returning count into v_count;
    return query select 'ok'::text, v_count, -1;          -- -1 = unlimited
    return;
  end if;

  -- Free tier: increment only while under the limit (single atomic statement).
  insert into ai_usage (user_id, period, count)
    values (v_user, v_period, 1)
    on conflict (user_id, period) do update
      set count = ai_usage.count + 1, updated_at = now()
      where ai_usage.count < p_limit
    returning count into v_count;

  if v_count is null then
    -- DO UPDATE skipped (at/over limit) — report the current count, no change.
    select count into v_count from ai_usage where user_id = v_user and period = v_period;
    return query select 'limit'::text, coalesce(v_count, p_limit), 0;
  else
    return query select 'ok'::text, v_count, greatest(p_limit - v_count, 0);
  end if;
end;
$$;

revoke all on function public.consume_ai_credit(integer) from public;
grant execute on function public.consume_ai_credit(integer) to anon, authenticated;
