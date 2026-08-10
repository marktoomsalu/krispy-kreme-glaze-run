-- ============================================================
-- Migration 002: weekly leaderboard.
--
-- Run this against the already-live project (paste into a fresh
-- SQL Editor query, Run). Adds the weekly_leaderboard table and
-- extends submit_score() to also upsert into it and return
-- weekly_rank — safe to run once. For a brand-new project, just
-- run supabase/schema.sql instead; it already has this baked in.
-- ============================================================

-- ---------------------------------------------------------------- weekly_leaderboard: one row per player per ISO week

create table public.weekly_leaderboard (
  id         uuid primary key default gen_random_uuid(),
  player_id  uuid not null,
  week_start date not null,
  nickname   text not null,
  score      int not null,
  dozens     int not null default 0,
  created_at timestamptz not null default now(),
  unique (player_id, week_start)
);

create index weekly_leaderboard_week_score_idx
  on public.weekly_leaderboard (week_start, score desc);

alter table public.weekly_leaderboard enable row level security;
revoke all on public.weekly_leaderboard from anon, authenticated;

create policy "weekly leaderboard is publicly readable"
  on public.weekly_leaderboard for select
  to anon, authenticated
  using (true);

grant select on public.weekly_leaderboard to anon, authenticated;
-- No insert/update/delete grants — only submit_score() writes here.

-- ---------------------------------------------------------------- submit_score(): new return shape (weekly_rank added), so drop first

drop function if exists public.submit_score(uuid, text, numeric, int, int, int, int, text, uuid);

create or replace function public.submit_score(
  p_run_id    uuid,
  p_token     text,
  p_distance  numeric,
  p_bonus     int,
  p_dozens    int,
  p_holes     int,
  p_smashes   int,
  p_nickname  text,
  p_player_id uuid
)
returns table(
  accepted    boolean,
  score       int,
  rank        int,
  tier        text,
  claim_code  text,
  is_new_best boolean,
  weekly_rank int,
  reason      text
)
language plpgsql
security definer
set search_path = public, extensions
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
  c_min_hole_gap          constant numeric := 880; -- CFG.holes.minGap — smallest real gap between hole bursts
  c_max_holes_per_burst   constant int := 6;       -- CFG.holes.js burst size is 3 + floor(random()*4), max 6
  c_grace_seconds         constant numeric := 5; -- covers start_run's network round trip + rAF jitter
  c_max_session_seconds   constant numeric := 1200; -- 20 min; bounds how long a token can be "banked"

  -- prize tiers — deliberately steep. ~60s of near-perfect play for the
  -- discount, ~150s (2.5min) for the free donut, given this game's
  -- difficulty ramp (twin obstacles past score 380, flying boxes past
  -- 260). Tune freely after seeing real score distribution; both live
  -- as named constants so nothing else has to change to retune.
  discount_threshold      constant int := 3000;
  free_donut_threshold    constant int := 8000;

  v_row            public.run_tokens%rowtype;
  v_elapsed        numeric;
  v_t              numeric;
  v_t_cap          numeric;
  v_x              numeric;
  v_max_distance   numeric;
  v_max_holes      int;
  v_expected_bonus int;
  v_score          int;
  v_rank           int;
  v_tier           text;
  v_claim_code     text;
  v_leaderboard_id uuid;
  v_nickname       text;
  v_existing_id    uuid;
  v_existing_score int;
  v_is_new_best    boolean;
  v_best_score     int;

  v_week_start            date;
  v_weekly_id             uuid;
  v_weekly_existing_score int;
  v_weekly_best_score     int;
  v_weekly_rank           int;
begin
  if p_player_id is null then
    return query select false, null::int, null::int, null::text, null::text, null::boolean, null::int, 'missing_player_id';
    return;
  end if;

  select * into v_row
  from public.run_tokens
  where id = p_run_id and token = p_token and used = false
  for update;

  if not found then
    return query select false, null::int, null::int, null::text, null::text, null::boolean, null::int, 'invalid_or_used_token';
    return;
  end if;

  -- burn the token now, accepted or not, so it can never be retried
  update public.run_tokens set used = true where id = p_run_id;

  v_elapsed := extract(epoch from (now() - v_row.created_at));

  if v_elapsed < 0 or v_elapsed > c_max_session_seconds then
    return query select false, null::int, null::int, null::text, null::text, null::boolean, null::int, 'session_too_long';
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
    return query select false, null::int, null::int, null::text, null::text, null::boolean, null::int, 'distance_implausible';
    return;
  end if;

  if p_holes < 0 or p_dozens < 0 or p_smashes < 0 then
    return query select false, null::int, null::int, null::text, null::text, null::boolean, null::int, 'negative_field';
    return;
  end if;

  -- holes are gated by real distance travelled too, at CFG.holes' burst
  -- density — without this, a tiny/zero distance + huge p_holes/p_bonus
  -- would sail through every other check untouched.
  v_max_holes := ceil(v_max_distance / c_min_hole_gap) * c_max_holes_per_burst;
  if p_holes > v_max_holes then
    return query select false, null::int, null::int, null::text, null::text, null::boolean, null::int, 'holes_implausible';
    return;
  end if;

  v_expected_bonus := p_holes * c_hole_value + p_smashes * c_smash_value;
  if p_bonus is distinct from v_expected_bonus then
    return query select false, null::int, null::int, null::text, null::text, null::boolean, null::int, 'bonus_mismatch';
    return;
  end if;

  if p_dozens * 12 > p_holes then
    return query select false, null::int, null::int, null::text, null::text, null::boolean, null::int, 'dozens_exceed_holes';
    return;
  end if;

  if p_smashes > p_dozens * c_max_smashes_per_dozen then
    return query select false, null::int, null::int, null::text, null::text, null::boolean, null::int, 'smashes_implausible';
    return;
  end if;

  v_score := floor(p_distance / c_px_per_metre) + p_bonus;
  v_nickname := left(coalesce(nullif(trim(p_nickname), ''), 'Anonüümne'), 20);

  select lb.id, lb.score into v_existing_id, v_existing_score
  from public.leaderboard as lb
  where lb.player_id = p_player_id;

  if not found then
    v_is_new_best := true;
    insert into public.leaderboard (player_id, nickname, score, dozens, tier)
    values (p_player_id, v_nickname, v_score, p_dozens, null)
    returning id into v_leaderboard_id;
  elsif v_score > v_existing_score then
    v_is_new_best := true;
    update public.leaderboard
    set nickname = v_nickname, score = v_score, dozens = p_dozens, created_at = now()
    where id = v_existing_id
    returning id into v_leaderboard_id;
  else
    v_is_new_best := false;
    v_leaderboard_id := v_existing_id;
  end if;

  -- weekly leaderboard: same "only overwrite if this run beats the
  -- existing row" upsert as the all-time table above, scoped to the ISO
  -- week (Monday-start, UTC) instead of being global. `at time zone
  -- 'utc'` is explicit so this doesn't depend on this session's ambient
  -- TimeZone setting — must match src/leaderboard.js's currentWeekStart()
  -- exactly, or a submission can land in a week bucket the client never
  -- reads back.
  v_week_start := (date_trunc('week', now() at time zone 'utc'))::date;

  select wl.id, wl.score into v_weekly_id, v_weekly_existing_score
  from public.weekly_leaderboard as wl
  where wl.player_id = p_player_id and wl.week_start = v_week_start;

  if not found then
    insert into public.weekly_leaderboard (player_id, week_start, nickname, score, dozens)
    values (p_player_id, v_week_start, v_nickname, v_score, p_dozens)
    returning id into v_weekly_id;
  elsif v_score > v_weekly_existing_score then
    update public.weekly_leaderboard
    set nickname = v_nickname, score = v_score, dozens = p_dozens, created_at = now()
    where id = v_weekly_id
    returning id into v_weekly_id;
  end if;

  select lb.score into v_best_score from public.leaderboard as lb where lb.id = v_leaderboard_id;

  select count(*) + 1 into v_rank from public.leaderboard as lb where lb.score > v_best_score;

  select wl.score into v_weekly_best_score from public.weekly_leaderboard as wl where wl.id = v_weekly_id;

  select count(*) + 1 into v_weekly_rank
  from public.weekly_leaderboard as wl
  where wl.week_start = v_week_start and wl.score > v_weekly_best_score;

  if v_best_score >= free_donut_threshold then
    v_tier := 'free_donut';
  elsif v_best_score >= discount_threshold then
    v_tier := 'discount';
  else
    v_tier := null;
  end if;

  if v_tier is not null then
    update public.leaderboard set tier = v_tier where id = v_leaderboard_id;

    select c.claim_code into v_claim_code
    from public.claims as c
    where c.leaderboard_id = v_leaderboard_id and c.tier = v_tier;

    if v_claim_code is null then
      v_claim_code := 'KK-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
      insert into public.claims (leaderboard_id, tier, claim_code)
      values (v_leaderboard_id, v_tier, v_claim_code);
    end if;
  end if;

  return query select true, v_score, v_rank, v_tier, v_claim_code, v_is_new_best, v_weekly_rank, null::text;
end;
$$;

revoke all on function public.submit_score(uuid, text, numeric, int, int, int, int, text, uuid) from public;
grant execute on function public.submit_score(uuid, text, numeric, int, int, int, int, text, uuid) to anon, authenticated;
