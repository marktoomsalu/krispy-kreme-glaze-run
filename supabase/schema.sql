-- ============================================================
-- Krispy Kreme: Glaze Run — leaderboard schema.
--
-- One-time setup: Supabase dashboard → SQL Editor → New query →
-- paste this whole file → Run. From-scratch script, not a
-- migration — don't re-run against a project that already has
-- these objects (drop them first if you need to reset).
--
-- After running this, copy your Project URL and anon public key
-- (Project Settings → API) into src/leaderboard.js. Both are safe
-- to commit publicly — everything they can do is governed by the
-- RLS policies and SECURITY DEFINER functions below, not secrecy.
-- ============================================================

create extension if not exists pgcrypto; -- gen_random_bytes(); gen_random_uuid() is built into PG13+

-- ---------------------------------------------------------------- tables

create table public.run_tokens (
  id         uuid primary key default gen_random_uuid(),
  token      text not null default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now(),
  used       boolean not null default false
);

create table public.leaderboard (
  id         uuid primary key default gen_random_uuid(),
  nickname   text not null,
  score      int not null,
  dozens     int not null default 0,
  tier       text,
  created_at timestamptz not null default now()
);

create table public.claims (
  id             uuid primary key default gen_random_uuid(),
  leaderboard_id uuid references public.leaderboard(id) on delete cascade,
  tier           text not null,
  claim_code     text not null unique,
  status         text not null default 'pending',
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------- RLS + grants
--
-- Supabase's default privileges can grant broad access to anon/
-- authenticated on newly created tables — don't rely on RLS alone,
-- explicitly revoke first, then grant back only what's needed.

alter table public.run_tokens  enable row level security; -- no policies added below -> deny-all to anon/authenticated
alter table public.leaderboard enable row level security;
alter table public.claims      enable row level security; -- no policies added below -> deny-all to anon/authenticated

revoke all on public.run_tokens  from anon, authenticated;
revoke all on public.claims      from anon, authenticated;
revoke all on public.leaderboard from anon, authenticated;

-- IMPORTANT: do NOT run `alter table ... force row level security` on
-- these tables. The SECURITY DEFINER functions below run as their
-- owner (the role that ran this script — usually `postgres`), and
-- table owners bypass RLS unless FORCE is set. FORCE would lock the
-- functions themselves out too, which breaks everything.

create policy "leaderboard is publicly readable"
  on public.leaderboard for select
  to anon, authenticated
  using (true);

grant select on public.leaderboard to anon, authenticated;
-- No insert/update/delete grants on leaderboard for anon/authenticated —
-- only submit_score() (SECURITY DEFINER, below) writes to it.

-- ---------------------------------------------------------------- start_run()

create or replace function public.start_run()
returns table(run_id uuid, token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_token text;
begin
  insert into public.run_tokens default values
  returning id, token into v_id, v_token;

  return query select v_id, v_token;
end;
$$;

revoke all on function public.start_run() from public;
grant execute on function public.start_run() to anon, authenticated;

-- ---------------------------------------------------------------- submit_score()
--
-- Independently recomputes the score from structured run data and
-- rejects anything that isn't physically reachable in the elapsed
-- server-side time. This is a soft plausibility filter tuned to the
-- game's actual difficulty curve, not a bulletproof anti-cheat system
-- — appropriate for a giveaway prize, not a financial one.

create or replace function public.submit_score(
  p_run_id   uuid,
  p_token    text,
  p_distance numeric,
  p_bonus    int,
  p_dozens   int,
  p_holes    int,
  p_smashes  int,
  p_nickname text
)
returns table(accepted boolean, score int, rank int, tier text, claim_code text, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  -- physics constants — mirror src/config.js. If you tune the game's
  -- speed/scoring numbers, update both places or scores will start
  -- getting wrongly rejected (or wrongly accepted).
  c_speed_base            constant numeric := 380;
  c_gain_per_pixel        constant numeric := 0.016;
  c_max_gain              constant numeric := 360;
  c_dist_cap              constant numeric := c_max_gain / c_gain_per_pixel;   -- 22500
  c_speed_cap             constant numeric := c_speed_base + c_max_gain;      -- 740
  c_px_per_metre          constant numeric := 12;
  c_hole_value            constant int := 10;
  c_smash_value           constant int := 25;
  c_max_smashes_per_dozen constant int := 10;    -- real max ~6 per rush window; generous soft ceiling
  c_grace_seconds         constant numeric := 5; -- covers start_run's network round trip + rAF jitter
  c_max_session_seconds   constant numeric := 1200; -- 20 min; bounds how long a token can be "banked"

  -- prize tiers — tune freely after seeing real score distribution.
  -- names are stable so the client never has to hardcode numbers.
  discount_threshold      constant int := 1200;
  free_donut_threshold    constant int := 4000;

  v_row            public.run_tokens%rowtype;
  v_elapsed        numeric;
  v_t              numeric;
  v_t_cap          numeric;
  v_x              numeric;
  v_max_distance   numeric;
  v_expected_bonus int;
  v_score          int;
  v_rank           int;
  v_tier           text;
  v_claim_code     text;
  v_leaderboard_id uuid;
  v_nickname       text;
begin
  select * into v_row
  from public.run_tokens
  where id = p_run_id and token = p_token and used = false
  for update;

  if not found then
    return query select false, null::int, null::int, null::text, null::text, 'invalid_or_used_token';
    return;
  end if;

  -- burn the token now, accepted or not, so it can never be retried
  update public.run_tokens set used = true where id = p_run_id;

  v_elapsed := extract(epoch from (now() - v_row.created_at));

  if v_elapsed < 0 or v_elapsed > c_max_session_seconds then
    return query select false, null::int, null::int, null::text, null::text, 'session_too_long';
    return;
  end if;

  -- closed-form ceiling: dx/dt = base + k*x until the speed cap, then linear.
  v_t := v_elapsed + c_grace_seconds;
  v_x := (c_speed_base / c_gain_per_pixel) * (exp(c_gain_per_pixel * v_t) - 1);

  if v_x <= c_dist_cap then
    v_max_distance := v_x;
  else
    v_t_cap := ln(c_dist_cap * c_gain_per_pixel / c_speed_base + 1) / c_gain_per_pixel;
    v_max_distance := c_dist_cap + c_speed_cap * (v_t - v_t_cap);
  end if;

  if p_distance < 0 or p_distance > v_max_distance then
    return query select false, null::int, null::int, null::text, null::text, 'distance_implausible';
    return;
  end if;

  if p_holes < 0 or p_dozens < 0 or p_smashes < 0 then
    return query select false, null::int, null::int, null::text, null::text, 'negative_field';
    return;
  end if;

  v_expected_bonus := p_holes * c_hole_value + p_smashes * c_smash_value;
  if p_bonus is distinct from v_expected_bonus then
    return query select false, null::int, null::int, null::text, null::text, 'bonus_mismatch';
    return;
  end if;

  if p_dozens * 12 > p_holes then
    return query select false, null::int, null::int, null::text, null::text, 'dozens_exceed_holes';
    return;
  end if;

  if p_smashes > p_dozens * c_max_smashes_per_dozen then
    return query select false, null::int, null::int, null::text, null::text, 'smashes_implausible';
    return;
  end if;

  v_score := floor(p_distance / c_px_per_metre) + p_bonus;
  v_nickname := left(coalesce(nullif(trim(p_nickname), ''), 'Anonüümne'), 20);

  insert into public.leaderboard (nickname, score, dozens, tier)
  values (v_nickname, v_score, p_dozens, null)
  returning id into v_leaderboard_id;

  select count(*) + 1 into v_rank from public.leaderboard where score > v_score;

  if v_score >= free_donut_threshold then
    v_tier := 'free_donut';
  elsif v_score >= discount_threshold then
    v_tier := 'discount';
  end if;

  if v_tier is not null then
    v_claim_code := 'KK-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    insert into public.claims (leaderboard_id, tier, claim_code)
    values (v_leaderboard_id, v_tier, v_claim_code);
    update public.leaderboard set tier = v_tier where id = v_leaderboard_id;
  end if;

  return query select true, v_score, v_rank, v_tier, v_claim_code, null::text;
end;
$$;

revoke all on function public.submit_score(uuid, text, numeric, int, int, int, int, text) from public;
grant execute on function public.submit_score(uuid, text, numeric, int, int, int, int, text) to anon, authenticated;
