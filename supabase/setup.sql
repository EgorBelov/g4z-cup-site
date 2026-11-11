-- ============================================================================
-- GENERATED FILE — do not edit.
--
-- Concatenation of supabase/migrations/*.sql, in order. Regenerate with:
--   node scripts/build-setup-sql.mjs
--
-- Paste the whole thing into the Supabase SQL Editor and run it once to set up
-- a fresh project. Afterwards, apply supabase/data/g4z-cup-10.sql for the
-- archived tenth cup.
-- ============================================================================

-- ─── 0001_schema.sql ─────────────────────────────────────────────

-- ============================================================================
-- G4Z CUP — core schema
--
-- Design notes
--  * Everything is scoped by tournament_id: the site is multi-tournament from
--    the first migration, so a new cup never overwrites a finished one.
--  * A tournament owns stages; a stage owns groups (round robin / swiss) or a
--    bracket (single / double elimination). Matches point at both.
--  * Match score and status are derived from games by triggers (0002), never
--    written by the application.
--  * Bracket progression is data, not string parsing: winner_to_match_id /
--    loser_to_match_id wire the bracket together.
-- ============================================================================

create type tournament_status as enum ('draft', 'upcoming', 'live', 'finished');
create type stage_kind as enum ('round_robin', 'swiss', 'single_elim', 'double_elim');
create type match_status as enum ('scheduled', 'live', 'finished', 'cancelled');
create type bracket_side as enum ('upper', 'lower', 'final');

-- ─── updated_at helper ──────────────────────────────────────────────────────

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ─── tournaments ────────────────────────────────────────────────────────────

create table public.tournaments (
  id            bigint generated always as identity primary key,
  slug          text        not null unique check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  name          text        not null,
  edition       integer,
  game          text        not null default 'Dota 2',
  status        tournament_status not null default 'draft',
  -- Exactly one tournament is "current" and shown on the home page. Finished
  -- editions stay readable forever at /t/<slug>.
  is_current    boolean     not null default false,
  starts_at     timestamptz,
  ends_at       timestamptz,
  time_zone     text        not null default 'Europe/Moscow',
  format_summary text,
  description   text,
  prize_pool    text,
  stream_url    text,
  telegram_url  text,
  logo_url      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index tournaments_single_current on public.tournaments (is_current)
  where is_current;

create trigger tournaments_touch before update on public.tournaments
  for each row execute function public.touch_updated_at();

-- ─── stages ─────────────────────────────────────────────────────────────────

create table public.stages (
  id            bigint generated always as identity primary key,
  tournament_id bigint      not null references public.tournaments (id) on delete cascade,
  kind          stage_kind  not null,
  name          text        not null,
  sort_order    integer     not null default 0,
  best_of       integer     not null default 1 check (best_of in (1, 3, 5, 7)),
  -- How many teams advance out of each group (round robin / swiss only).
  advance_count integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index stages_tournament_idx on public.stages (tournament_id, sort_order);

create trigger stages_touch before update on public.stages
  for each row execute function public.touch_updated_at();

-- ─── groups ─────────────────────────────────────────────────────────────────

create table public.groups (
  id            bigint generated always as identity primary key,
  tournament_id bigint  not null references public.tournaments (id) on delete cascade,
  stage_id      bigint  not null references public.stages (id) on delete cascade,
  name          text    not null,
  sort_order    integer not null default 0
);

create index groups_stage_idx on public.groups (stage_id, sort_order);

-- ─── teams & players ────────────────────────────────────────────────────────

create table public.teams (
  id            bigint generated always as identity primary key,
  tournament_id bigint      not null references public.tournaments (id) on delete cascade,
  slug          text        not null check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  name          text        not null,
  tag           text,
  logo_url      text,
  -- Seed drives bracket placement and group draws.
  seed          integer,
  group_id      bigint      references public.groups (id) on delete set null,
  description   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tournament_id, slug)
);

create index teams_tournament_idx on public.teams (tournament_id, name);
create index teams_group_idx on public.teams (group_id);

create trigger teams_touch before update on public.teams
  for each row execute function public.touch_updated_at();

create table public.players (
  id          bigint generated always as identity primary key,
  team_id     bigint  not null references public.teams (id) on delete cascade,
  nickname    text    not null,
  real_name   text,
  role        text,
  is_captain  boolean not null default false,
  is_standin  boolean not null default false,
  steam_url   text,
  dotabuff_url text,
  sort_order  integer not null default 0
);

create index players_team_idx on public.players (team_id, sort_order);

-- ─── matches ────────────────────────────────────────────────────────────────

create table public.matches (
  id            bigint generated always as identity primary key,
  tournament_id bigint       not null references public.tournaments (id) on delete cascade,
  stage_id      bigint       not null references public.stages (id) on delete cascade,
  group_id      bigint       references public.groups (id) on delete set null,

  round         integer      not null default 1,
  round_label   text,
  bracket       bracket_side,
  -- Position inside the round; also drives bracket layout order.
  position      integer      not null default 1,
  best_of       integer      not null default 1 check (best_of in (1, 3, 5, 7)),

  team1_id      bigint       references public.teams (id) on delete set null,
  team2_id      bigint       references public.teams (id) on delete set null,
  -- Human-readable placeholders for empty slots ("Winner of M3", "2nd Group A").
  team1_source  text,
  team2_source  text,

  score1        integer      not null default 0,
  score2        integer      not null default 0,
  winner_id     bigint       references public.teams (id) on delete set null,
  loser_id      bigint       references public.teams (id) on delete set null,

  status        match_status not null default 'scheduled',
  scheduled_at  timestamptz,
  started_at    timestamptz,
  finished_at   timestamptz,

  stream_url    text,
  vod_url       text,
  notes         text,
  is_featured   boolean      not null default false,

  -- Bracket wiring: where the winner and the loser of this match go next.
  winner_to_match_id bigint  references public.matches (id) on delete set null,
  winner_to_slot     smallint check (winner_to_slot in (1, 2)),
  loser_to_match_id  bigint  references public.matches (id) on delete set null,
  loser_to_slot      smallint check (loser_to_slot in (1, 2)),

  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now(),

  constraint matches_distinct_teams check (team1_id is null or team1_id <> team2_id),
  constraint matches_winner_slot_pair check (
    (winner_to_match_id is null) = (winner_to_slot is null)
  ),
  constraint matches_loser_slot_pair check (
    (loser_to_match_id is null) = (loser_to_slot is null)
  ),
  constraint matches_no_self_link check (
    winner_to_match_id is distinct from id and loser_to_match_id is distinct from id
  )
);

create index matches_tournament_time_idx on public.matches (tournament_id, scheduled_at);
create index matches_stage_idx on public.matches (stage_id, round, position);
create index matches_group_idx on public.matches (group_id);
create index matches_status_idx on public.matches (tournament_id, status);
create index matches_team1_idx on public.matches (team1_id);
create index matches_team2_idx on public.matches (team2_id);

create trigger matches_touch before update on public.matches
  for each row execute function public.touch_updated_at();

-- ─── games (maps) and drafts ────────────────────────────────────────────────

create table public.games (
  id               bigint generated always as identity primary key,
  match_id         bigint  not null references public.matches (id) on delete cascade,
  game_number      integer not null,
  winner_id        bigint  references public.teams (id) on delete set null,
  radiant_team_id  bigint  references public.teams (id) on delete set null,
  first_pick_team_id bigint references public.teams (id) on delete set null,
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  dota_match_id    bigint,
  notes            text,
  created_at       timestamptz not null default now(),
  unique (match_id, game_number)
);

create index games_match_idx on public.games (match_id, game_number);

create table public.heroes (
  id   bigint generated always as identity primary key,
  slug text not null unique,
  name text not null
);

create table public.game_picks (
  id       bigint generated always as identity primary key,
  game_id  bigint  not null references public.games (id) on delete cascade,
  team_id  bigint  not null references public.teams (id) on delete cascade,
  hero     text    not null,
  player_id bigint references public.players (id) on delete set null,
  player_name text,
  order_no integer not null,
  unique (game_id, team_id, order_no)
);

create index game_picks_game_idx on public.game_picks (game_id);

create table public.game_bans (
  id       bigint generated always as identity primary key,
  game_id  bigint  not null references public.games (id) on delete cascade,
  team_id  bigint  not null references public.teams (id) on delete cascade,
  hero     text    not null,
  order_no integer not null,
  unique (game_id, team_id, order_no)
);

create index game_bans_game_idx on public.game_bans (game_id);

-- ─── results: final places and awards ───────────────────────────────────────

create table public.placements (
  id            bigint generated always as identity primary key,
  tournament_id bigint  not null references public.tournaments (id) on delete cascade,
  place         integer not null check (place > 0),
  team_id       bigint  references public.teams (id) on delete set null,
  -- Kept for imported history where the team row may not exist.
  team_label    text,
  prize         text,
  note          text,
  unique (tournament_id, place)
);

create table public.awards (
  id            bigint generated always as identity primary key,
  tournament_id bigint  not null references public.tournaments (id) on delete cascade,
  title         text    not null,
  player_id     bigint  references public.players (id) on delete set null,
  nickname      text,
  team_id       bigint  references public.teams (id) on delete set null,
  team_label    text,
  note          text,
  sort_order    integer not null default 0
);

create index awards_tournament_idx on public.awards (tournament_id, sort_order);

-- ─── operational tables (never exposed to the public role) ──────────────────

create table public.login_attempts (
  id           bigint generated always as identity primary key,
  ip           text    not null,
  succeeded    boolean not null,
  attempted_at timestamptz not null default now()
);

create index login_attempts_ip_idx on public.login_attempts (ip, attempted_at desc);

create table public.audit_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  action     text        not null,
  entity     text        not null,
  entity_id  bigint,
  summary    text,
  payload    jsonb,
  ip         text
);

create index audit_log_at_idx on public.audit_log (at desc);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);

-- ─── 0002_logic.sql ──────────────────────────────────────────────

-- ============================================================================
-- Derived state lives in the database, so every writer (app, SQL console,
-- import script) produces consistent results.
--
--  * recalc_match  — score, status, winner and timestamps from the game rows
--  * advance_bracket — pushes winner/loser into the next match slot
-- ============================================================================

create function public.recalc_match(p_match_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare
  m           public.matches;
  wins1       integer;
  wins2       integer;
  game_count  integer;
  needed      integer;
  decided     boolean;
  new_winner  bigint;
  new_loser   bigint;
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found then
    return;
  end if;

  select
    count(*) filter (where g.winner_id is not null and g.winner_id = m.team1_id),
    count(*) filter (where g.winner_id is not null and g.winner_id = m.team2_id),
    count(*)
  into wins1, wins2, game_count
  from public.games g
  where g.match_id = p_match_id;

  -- bo1 -> 1, bo3 -> 2, bo5 -> 3
  needed := (m.best_of / 2) + 1;
  decided := wins1 >= needed or wins2 >= needed;

  if wins1 >= needed then
    new_winner := m.team1_id;
    new_loser := m.team2_id;
  elsif wins2 >= needed then
    new_winner := m.team2_id;
    new_loser := m.team1_id;
  else
    new_winner := null;
    new_loser := null;
  end if;

  update public.matches set
    score1 = wins1,
    score2 = wins2,
    winner_id = new_winner,
    loser_id = new_loser,
    status = case
      when m.status = 'cancelled' then 'cancelled'
      when decided then 'finished'::match_status
      when game_count > 0 then 'live'::match_status
      when m.status = 'live' then 'live'::match_status
      else 'scheduled'::match_status
    end,
    started_at = case
      when game_count > 0 or m.status = 'live' then coalesce(m.started_at, now())
      else m.started_at
    end,
    finished_at = case when decided then coalesce(m.finished_at, now()) else null end
  where id = p_match_id;
end;
$$;

create function public.games_recalc_match() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalc_match(old.match_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and new.match_id <> old.match_id then
    perform public.recalc_match(old.match_id);
  end if;

  perform public.recalc_match(new.match_id);
  return new;
end;
$$;

create trigger games_recalc after insert or update or delete on public.games
  for each row execute function public.games_recalc_match();

-- Changing the teams or the series length invalidates the derived score.
create function public.matches_recalc_self() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.recalc_match(new.id);
  return null;
end;
$$;

create trigger matches_recalc after update of team1_id, team2_id, best_of on public.matches
  for each row execute function public.matches_recalc_self();

-- ─── bracket progression ────────────────────────────────────────────────────

create function public.set_match_slot(
  p_match_id bigint,
  p_slot smallint,
  p_team_id bigint
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_match_id is null or p_slot is null then
    return;
  end if;

  if p_slot = 1 then
    update public.matches set team1_id = p_team_id where id = p_match_id;
  else
    update public.matches set team2_id = p_team_id where id = p_match_id;
  end if;
end;
$$;

-- Only clears the slot when it still holds the team we previously put there,
-- so a manual override by an admin is never silently reverted.
create function public.clear_match_slot(
  p_match_id bigint,
  p_slot smallint,
  p_team_id bigint
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_match_id is null or p_slot is null or p_team_id is null then
    return;
  end if;

  if p_slot = 1 then
    update public.matches set team1_id = null
      where id = p_match_id and team1_id = p_team_id;
  else
    update public.matches set team2_id = null
      where id = p_match_id and team2_id = p_team_id;
  end if;
end;
$$;

create function public.advance_bracket() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  is_finished boolean := new.status = 'finished' and new.winner_id is not null;
begin
  if is_finished then
    perform public.set_match_slot(new.winner_to_match_id, new.winner_to_slot, new.winner_id);
    perform public.set_match_slot(new.loser_to_match_id, new.loser_to_slot, new.loser_id);
  else
    -- Match was un-finished (score corrected, game deleted): roll the
    -- downstream slots back.
    perform public.clear_match_slot(new.winner_to_match_id, new.winner_to_slot, old.winner_id);
    perform public.clear_match_slot(new.loser_to_match_id, new.loser_to_slot, old.loser_id);
  end if;

  return null;
end;
$$;

-- Fires only when the outcome columns are touched, so writing team1_id/team2_id
-- (which is exactly what set_match_slot does) cannot recurse.
create trigger matches_advance after update of winner_id, loser_id, status on public.matches
  for each row execute function public.advance_bracket();

-- ─── 0003_views.sql ──────────────────────────────────────────────

-- ============================================================================
-- Read models. The app only ever selects from these views, so joins and
-- standings arithmetic live in one place.
-- ============================================================================

create view public.match_details with (security_invoker = true) as
select
  m.id,
  m.tournament_id,
  t.slug            as tournament_slug,
  m.stage_id,
  s.name            as stage_name,
  s.kind            as stage_kind,
  s.sort_order      as stage_order,
  m.group_id,
  g.name            as group_name,
  m.round,
  m.round_label,
  m.bracket,
  m.position,
  m.best_of,
  m.team1_id,
  t1.name           as team1_name,
  t1.slug           as team1_slug,
  t1.tag            as team1_tag,
  t1.logo_url       as team1_logo,
  m.team1_source,
  m.team2_id,
  t2.name           as team2_name,
  t2.slug           as team2_slug,
  t2.tag            as team2_tag,
  t2.logo_url       as team2_logo,
  m.team2_source,
  m.score1,
  m.score2,
  m.winner_id,
  w.name            as winner_name,
  w.slug            as winner_slug,
  m.loser_id,
  m.status,
  m.scheduled_at,
  m.started_at,
  m.finished_at,
  m.stream_url,
  m.vod_url,
  m.notes,
  m.is_featured,
  m.winner_to_match_id,
  m.loser_to_match_id,
  (select count(*) from public.games gg where gg.match_id = m.id) as games_count
from public.matches m
join public.tournaments t on t.id = m.tournament_id
join public.stages s on s.id = m.stage_id
left join public.groups g on g.id = m.group_id
left join public.teams t1 on t1.id = m.team1_id
left join public.teams t2 on t2.id = m.team2_id
left join public.teams w on w.id = m.winner_id;

-- One row per team per match, used to aggregate standings.
create view public.match_sides with (security_invoker = true) as
select
  m.id as match_id, m.tournament_id, m.stage_id, m.group_id, m.status,
  m.team1_id as team_id, m.team2_id as opponent_id,
  m.score1 as maps_won, m.score2 as maps_lost, m.winner_id
from public.matches m
where m.team1_id is not null
union all
select
  m.id, m.tournament_id, m.stage_id, m.group_id, m.status,
  m.team2_id, m.team1_id,
  m.score2, m.score1, m.winner_id
from public.matches m
where m.team2_id is not null;

-- Group / swiss standings. Teams with no games played are included, which is
-- what an organiser wants to see before the first round.
create view public.standings with (security_invoker = true) as
select
  t.tournament_id,
  g.stage_id,
  s.name                        as stage_name,
  t.group_id,
  g.name                        as group_name,
  g.sort_order                  as group_order,
  t.id                          as team_id,
  t.name                        as team_name,
  t.slug                        as team_slug,
  t.tag                         as team_tag,
  t.logo_url                    as team_logo,
  t.seed,
  s.advance_count,
  count(ms.match_id) filter (where ms.status = 'finished')                              as played,
  count(ms.match_id) filter (where ms.status = 'finished' and ms.winner_id = t.id)      as wins,
  count(ms.match_id) filter (
    where ms.status = 'finished' and ms.winner_id is not null and ms.winner_id <> t.id
  )                                                                                     as losses,
  coalesce(sum(ms.maps_won) filter (where ms.status = 'finished'), 0)::integer          as maps_won,
  coalesce(sum(ms.maps_lost) filter (where ms.status = 'finished'), 0)::integer         as maps_lost,
  (
    coalesce(sum(ms.maps_won) filter (where ms.status = 'finished'), 0)
    - coalesce(sum(ms.maps_lost) filter (where ms.status = 'finished'), 0)
  )::integer                                                                            as map_diff
from public.teams t
join public.groups g on g.id = t.group_id
join public.stages s on s.id = g.stage_id
left join public.match_sides ms on ms.team_id = t.id and ms.group_id = t.group_id
group by
  t.tournament_id, g.stage_id, s.name, t.group_id, g.name, g.sort_order,
  t.id, t.name, t.slug, t.tag, t.logo_url, t.seed, s.advance_count;

-- Archive listing: one row per tournament with the headline numbers.
create view public.tournament_summaries with (security_invoker = true) as
select
  t.*,
  (select count(*) from public.teams tm where tm.tournament_id = t.id)          as team_count,
  (select count(*) from public.matches m where m.tournament_id = t.id)          as match_count,
  (
    select coalesce(ch.name, p.team_label)
    from public.placements p
    left join public.teams ch on ch.id = p.team_id
    where p.tournament_id = t.id and p.place = 1
    limit 1
  )                                                                             as champion_name
from public.tournaments t;

-- ─── 0004_rls.sql ────────────────────────────────────────────────

-- ============================================================================
-- Row level security.
--
-- The public (anon) role gets SELECT on published tournaments and nothing else.
-- There is deliberately no INSERT/UPDATE/DELETE policy anywhere: writes are
-- only possible with the service role key, which lives in server-side env vars
-- and is never shipped to the browser.
--
-- Draft tournaments are invisible to the public, so next year's cup can be
-- prepared on the live site without leaking.
-- ============================================================================

create function public.tournament_is_published(p_tournament_id bigint)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tournaments t
    where t.id = p_tournament_id and t.status <> 'draft'
  );
$$;

alter table public.tournaments   enable row level security;
alter table public.stages        enable row level security;
alter table public.groups        enable row level security;
alter table public.teams         enable row level security;
alter table public.players       enable row level security;
alter table public.matches       enable row level security;
alter table public.games         enable row level security;
alter table public.game_picks    enable row level security;
alter table public.game_bans     enable row level security;
alter table public.placements    enable row level security;
alter table public.awards        enable row level security;
alter table public.heroes        enable row level security;

-- No policies at all: unreachable for anon and authenticated. Privileges are
-- revoked as well, so even adding a policy by mistake cannot expose them.
alter table public.login_attempts enable row level security;
alter table public.audit_log      enable row level security;

revoke all on public.login_attempts from anon, authenticated;
revoke all on public.audit_log      from anon, authenticated;

create policy "public reads published tournaments" on public.tournaments
  for select to anon, authenticated using (status <> 'draft');

create policy "public reads stages" on public.stages
  for select to anon, authenticated using (public.tournament_is_published(tournament_id));

create policy "public reads groups" on public.groups
  for select to anon, authenticated using (public.tournament_is_published(tournament_id));

create policy "public reads teams" on public.teams
  for select to anon, authenticated using (public.tournament_is_published(tournament_id));

create policy "public reads matches" on public.matches
  for select to anon, authenticated using (public.tournament_is_published(tournament_id));

create policy "public reads placements" on public.placements
  for select to anon, authenticated using (public.tournament_is_published(tournament_id));

create policy "public reads awards" on public.awards
  for select to anon, authenticated using (public.tournament_is_published(tournament_id));

create policy "public reads players" on public.players
  for select to anon, authenticated using (
    exists (
      select 1 from public.teams t
      where t.id = players.team_id
        and public.tournament_is_published(t.tournament_id)
    )
  );

create policy "public reads games" on public.games
  for select to anon, authenticated using (
    exists (
      select 1 from public.matches m
      where m.id = games.match_id
        and public.tournament_is_published(m.tournament_id)
    )
  );

create policy "public reads picks" on public.game_picks
  for select to anon, authenticated using (
    exists (
      select 1 from public.games g
      join public.matches m on m.id = g.match_id
      where g.id = game_picks.game_id
        and public.tournament_is_published(m.tournament_id)
    )
  );

create policy "public reads bans" on public.game_bans
  for select to anon, authenticated using (
    exists (
      select 1 from public.games g
      join public.matches m on m.id = g.match_id
      where g.id = game_bans.game_id
        and public.tournament_is_published(m.tournament_id)
    )
  );

create policy "public reads heroes" on public.heroes
  for select to anon, authenticated using (true);

-- ─── realtime ───────────────────────────────────────────────────────────────
-- Live pages subscribe to these tables and refresh themselves; guarded so the
-- migration also applies to a plain Postgres instance without Supabase's
-- realtime publication.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.matches;
    alter publication supabase_realtime add table public.games;
  end if;
end;
$$;

-- ─── 0005_heroes.sql ─────────────────────────────────────────────

-- ============================================================================
-- Hero reference list, used for pick/ban autocomplete in the admin panel.
-- Editable: organisers can add a hero the moment a patch ships one.
-- ============================================================================

insert into public.heroes (slug, name)
select trim(both '-' from lower(regexp_replace(name, '[^a-z0-9]+', '-', 'gi'))), name
from (
  values
    ('Abaddon'), ('Alchemist'), ('Ancient Apparition'), ('Anti-Mage'),
    ('Arc Warden'), ('Axe'), ('Bane'), ('Batrider'), ('Beastmaster'),
    ('Bloodseeker'), ('Bounty Hunter'), ('Brewmaster'), ('Bristleback'),
    ('Broodmother'), ('Centaur Warrunner'), ('Chaos Knight'), ('Chen'),
    ('Clinkz'), ('Clockwerk'), ('Crystal Maiden'), ('Dark Seer'),
    ('Dark Willow'), ('Dawnbreaker'), ('Dazzle'), ('Death Prophet'),
    ('Disruptor'), ('Doom'), ('Dragon Knight'), ('Drow Ranger'),
    ('Earth Spirit'), ('Earthshaker'), ('Elder Titan'), ('Ember Spirit'),
    ('Enchantress'), ('Enigma'), ('Faceless Void'), ('Grimstroke'),
    ('Gyrocopter'), ('Hoodwink'), ('Huskar'), ('Invoker'), ('Io'), ('Jakiro'),
    ('Juggernaut'), ('Keeper of the Light'), ('Kez'), ('Kunkka'),
    ('Legion Commander'), ('Leshrac'), ('Lich'), ('Lifestealer'), ('Lina'),
    ('Lion'), ('Lone Druid'), ('Luna'), ('Lycan'), ('Magnus'), ('Marci'),
    ('Mars'), ('Medusa'), ('Meepo'), ('Mirana'), ('Monkey King'),
    ('Morphling'), ('Muerta'), ('Naga Siren'), ('Nature''s Prophet'),
    ('Necrophos'), ('Night Stalker'), ('Nyx Assassin'), ('Ogre Magi'),
    ('Omniknight'), ('Oracle'), ('Outworld Destroyer'), ('Pangolier'),
    ('Phantom Assassin'), ('Phantom Lancer'), ('Phoenix'), ('Primal Beast'),
    ('Puck'), ('Pudge'), ('Pugna'), ('Queen of Pain'), ('Razor'), ('Riki'),
    ('Ringmaster'), ('Rubick'), ('Sand King'), ('Shadow Demon'),
    ('Shadow Fiend'), ('Shadow Shaman'), ('Silencer'), ('Skywrath Mage'),
    ('Slardar'), ('Slark'), ('Snapfire'), ('Sniper'), ('Spectre'),
    ('Spirit Breaker'), ('Storm Spirit'), ('Sven'), ('Techies'),
    ('Templar Assassin'), ('Terrorblade'), ('Tidehunter'), ('Timbersaw'),
    ('Tinker'), ('Tiny'), ('Treant Protector'), ('Troll Warlord'), ('Tusk'),
    ('Underlord'), ('Undying'), ('Ursa'), ('Vengeful Spirit'), ('Venomancer'),
    ('Viper'), ('Visage'), ('Void Spirit'), ('Warlock'), ('Weaver'),
    ('Windranger'), ('Winter Wyvern'), ('Witch Doctor'), ('Wraith King'),
    ('Zeus')
) as v (name)
on conflict (slug) do nothing;

-- ─── 0006_grants.sql ─────────────────────────────────────────────

-- ============================================================================
-- Explicit privileges for the public roles.
--
-- Supabase normally grants these automatically through default privileges, but
-- that depends on which role runs the migration. Spelling them out makes the
-- schema self-sufficient: it applies the same way to a Supabase project, a local
-- `supabase db reset`, and a plain Postgres instance in CI.
--
-- RLS (0004) is what actually restricts *which rows* these roles see. This file
-- only decides which relations they may touch at all.
-- ============================================================================

grant usage on schema public to anon, authenticated;

-- Tables and views alike; row filtering is handled by the RLS policies.
grant select on all tables in schema public to anon, authenticated;

-- Anything added by a later migration should behave the same way.
alter default privileges in schema public
  grant select on tables to anon, authenticated;

-- …except the operational tables, which stay completely out of reach.
revoke all on public.login_attempts from anon, authenticated;
revoke all on public.audit_log from anon, authenticated;

-- ─── 0007_bo2.sql ────────────────────────────────────────────────

-- ============================================================================
-- Best-of-2 series, and MMR on the roster.
--
-- A bo2 group stage is the format G4Z CUP 11 runs: both maps are always played,
-- so a series can end level. That single fact touches three places:
--
--  * the best_of check constraints, which only allowed odd series;
--  * recalc_match, which decided a series purely by "first to N wins" and would
--    have left a 1:1 hanging as `live` forever;
--  * the standings, which had nowhere to put a drawn series.
--
-- Points are 2 per win and 1 per draw — for a bo2 that is exactly "one point per
-- map won", and for an all-bo1 stage it ranks identically to the old wins sort.
-- ============================================================================

-- ─── bo2 is a legal series length ───────────────────────────────────────────

alter table public.stages drop constraint stages_best_of_check;
alter table public.stages add constraint stages_best_of_check
  check (best_of in (1, 2, 3, 5, 7));

alter table public.matches drop constraint matches_best_of_check;
alter table public.matches add constraint matches_best_of_check
  check (best_of in (1, 2, 3, 5, 7));

-- ─── a series can now end level ─────────────────────────────────────────────

create or replace function public.recalc_match(p_match_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare
  m           public.matches;
  wins1       integer;
  wins2       integer;
  game_count  integer;
  needed      integer;
  decided     boolean;
  new_winner  bigint;
  new_loser   bigint;
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found then
    return;
  end if;

  select
    count(*) filter (where g.winner_id is not null and g.winner_id = m.team1_id),
    count(*) filter (where g.winner_id is not null and g.winner_id = m.team2_id),
    count(*)
  into wins1, wins2, game_count
  from public.games g
  where g.match_id = p_match_id;

  -- bo1 -> 1, bo2 -> 2, bo3 -> 2, bo5 -> 3
  needed := (m.best_of / 2) + 1;

  -- An even series is also over once every map has been played, which is how a
  -- bo2 ends 1:1 instead of waiting for a winner that can never come.
  decided := wins1 >= needed
    or wins2 >= needed
    or (m.best_of % 2 = 0 and wins1 + wins2 >= m.best_of);

  if not decided or wins1 = wins2 then
    new_winner := null;
    new_loser := null;
  elsif wins1 > wins2 then
    new_winner := m.team1_id;
    new_loser := m.team2_id;
  else
    new_winner := m.team2_id;
    new_loser := m.team1_id;
  end if;

  update public.matches set
    score1 = wins1,
    score2 = wins2,
    winner_id = new_winner,
    loser_id = new_loser,
    status = case
      when m.status = 'cancelled' then 'cancelled'
      when decided then 'finished'::match_status
      when game_count > 0 then 'live'::match_status
      when m.status = 'live' then 'live'::match_status
      else 'scheduled'::match_status
    end,
    started_at = case
      when game_count > 0 or m.status = 'live' then coalesce(m.started_at, now())
      else m.started_at
    end,
    finished_at = case when decided then coalesce(m.finished_at, now()) else null end
  where id = p_match_id;
end;
$$;

-- ─── standings: draws and points ────────────────────────────────────────────

create or replace view public.standings with (security_invoker = true) as
select
  t.tournament_id,
  g.stage_id,
  s.name                        as stage_name,
  t.group_id,
  g.name                        as group_name,
  g.sort_order                  as group_order,
  t.id                          as team_id,
  t.name                        as team_name,
  t.slug                        as team_slug,
  t.tag                         as team_tag,
  t.logo_url                    as team_logo,
  t.seed,
  s.advance_count,
  count(ms.match_id) filter (where ms.status = 'finished')                              as played,
  count(ms.match_id) filter (where ms.status = 'finished' and ms.winner_id = t.id)      as wins,
  count(ms.match_id) filter (
    where ms.status = 'finished' and ms.winner_id is not null and ms.winner_id <> t.id
  )                                                                                     as losses,
  coalesce(sum(ms.maps_won) filter (where ms.status = 'finished'), 0)::integer          as maps_won,
  coalesce(sum(ms.maps_lost) filter (where ms.status = 'finished'), 0)::integer         as maps_lost,
  (
    coalesce(sum(ms.maps_won) filter (where ms.status = 'finished'), 0)
    - coalesce(sum(ms.maps_lost) filter (where ms.status = 'finished'), 0)
  )::integer                                                                            as map_diff,
  -- A finished series with no winner is a draw; only an even series can produce one.
  count(ms.match_id) filter (where ms.status = 'finished' and ms.winner_id is null)     as draws,
  (
    2 * count(ms.match_id) filter (where ms.status = 'finished' and ms.winner_id = t.id)
    + count(ms.match_id) filter (where ms.status = 'finished' and ms.winner_id is null)
  )::integer                                                                            as points
from public.teams t
join public.groups g on g.id = t.group_id
join public.stages s on s.id = g.stage_id
left join public.match_sides ms on ms.team_id = t.id and ms.group_id = t.group_id
group by
  t.tournament_id, g.stage_id, s.name, t.group_id, g.name, g.sort_order,
  t.id, t.name, t.slug, t.tag, t.logo_url, t.seed, s.advance_count;

-- ─── MMR on the roster ──────────────────────────────────────────────────────

alter table public.players
  add column mmr integer check (mmr is null or (mmr >= 0 and mmr <= 20000));

comment on column public.players.mmr is 'Заявленный MMR игрока на момент турнира.';

-- ─── 0008_stage_window.sql ───────────────────────────────────────

-- ============================================================================
-- Даты этапа и стыковые матчи.
--
-- G4Z CUP 11 объявляет этапы днями, а не временем: групповой этап идёт
-- 3–7 августа, плей-офф 8–9-го, а конкретный час каждого матча организаторы
-- проставляют по ходу. Поэтому окно живёт на этапе (`starts_on`/`ends_on`),
-- а `matches.scheduled_at` остаётся пустым, пока время действительно не назначат.
--
-- Второе: из группы напрямую выходят не все, кто продолжает борьбу. Сверх
-- `advance_count` идёт полоса команд, которые играют стыковые матчи за
-- оставшиеся слоты — её размер и хранит `playin_count`. Таблица группы
-- подсвечивает обе полосы из данных, без правил, зашитых в вёрстку.
-- ============================================================================

-- ─── окно этапа ─────────────────────────────────────────────────────────────

alter table public.stages
  add column starts_on date,
  add column ends_on   date;

alter table public.stages
  add constraint stages_window_order check (
    starts_on is null or ends_on is null or ends_on >= starts_on
  );

comment on column public.stages.starts_on is
  'Первый день этапа. Дата без времени: час матча назначается отдельно.';
comment on column public.stages.ends_on is
  'Последний день этапа.';

-- ─── полоса стыковых матчей ─────────────────────────────────────────────────

alter table public.stages
  add column playin_count integer check (playin_count is null or playin_count >= 0);

comment on column public.stages.playin_count is
  'Сколько команд ниже линии advance_count играют стыковые матчи за выход.';

-- ─── standings: показать полосу в таблице ───────────────────────────────────

create or replace view public.standings with (security_invoker = true) as
select
  t.tournament_id,
  g.stage_id,
  s.name                        as stage_name,
  t.group_id,
  g.name                        as group_name,
  g.sort_order                  as group_order,
  t.id                          as team_id,
  t.name                        as team_name,
  t.slug                        as team_slug,
  t.tag                         as team_tag,
  t.logo_url                    as team_logo,
  t.seed,
  s.advance_count,
  count(ms.match_id) filter (where ms.status = 'finished')                              as played,
  count(ms.match_id) filter (where ms.status = 'finished' and ms.winner_id = t.id)      as wins,
  count(ms.match_id) filter (
    where ms.status = 'finished' and ms.winner_id is not null and ms.winner_id <> t.id
  )                                                                                     as losses,
  coalesce(sum(ms.maps_won) filter (where ms.status = 'finished'), 0)::integer          as maps_won,
  coalesce(sum(ms.maps_lost) filter (where ms.status = 'finished'), 0)::integer         as maps_lost,
  (
    coalesce(sum(ms.maps_won) filter (where ms.status = 'finished'), 0)
    - coalesce(sum(ms.maps_lost) filter (where ms.status = 'finished'), 0)
  )::integer                                                                            as map_diff,
  -- A finished series with no winner is a draw; only an even series can produce one.
  count(ms.match_id) filter (where ms.status = 'finished' and ms.winner_id is null)     as draws,
  (
    2 * count(ms.match_id) filter (where ms.status = 'finished' and ms.winner_id = t.id)
    + count(ms.match_id) filter (where ms.status = 'finished' and ms.winner_id is null)
  )::integer                                                                            as points,
  s.playin_count
from public.teams t
join public.groups g on g.id = t.group_id
join public.stages s on s.id = g.stage_id
left join public.match_sides ms on ms.team_id = t.id and ms.group_id = t.group_id
group by
  t.tournament_id, g.stage_id, s.name, t.group_id, g.name, g.sort_order,
  t.id, t.name, t.slug, t.tag, t.logo_url, t.seed, s.advance_count, s.playin_count;

-- ─── 0009_match_lifecycle.sql ────────────────────────────────────

-- Lifecycle commands are validated atomically in the database. The app never
-- writes the derived score, status, winner or loser columns itself.
create function public.set_match_lifecycle(p_match_id bigint, p_status text)
returns void language plpgsql security invoker set search_path = public as $$
declare
  m public.matches;
begin
  if p_status is null or p_status not in ('scheduled', 'live', 'cancelled') then
    raise exception 'Недопустимое действие с матчем' using errcode = '22023';
  end if;

  select * into m from public.matches where id = p_match_id for update;
  if not found then
    raise exception 'Матч не найден' using errcode = 'P0002';
  end if;

  if m.status = 'finished' then
    raise exception 'Сначала отмените результат последней карты завершённого матча'
      using errcode = '23514';
  end if;
  if p_status = 'scheduled' and exists (
    select 1 from public.games where match_id = p_match_id
  ) then
    raise exception 'Сначала удалите карты матча, чтобы вернуть его в расписание'
      using errcode = '23514';
  end if;
  if p_status = 'live' and (m.team1_id is null or m.team2_id is null) then
    raise exception 'Для старта нужны обе команды'
      using errcode = '23514';
  end if;

  update public.matches set
    status = p_status::public.match_status,
    started_at = case
      when p_status = 'scheduled' then null
      when p_status = 'live' then coalesce(m.started_at, now())
      else m.started_at
    end,
    finished_at = null
  where id = p_match_id;

  -- The existing map/series rules remain authoritative for score and outcome.
  perform public.recalc_match(p_match_id);
end;
$$;

revoke all on function public.set_match_lifecycle(bigint, text)
  from public, anon, authenticated;

-- Supabase provides service_role; plain PostgreSQL test installations may not.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.set_match_lifecycle(bigint, text) to service_role;
  end if;
end;
$$;

-- ─── 0010_roster_identity.sql ────────────────────────────────────

-- Release 2 prerequisite: roster positions must never identify a person.
-- Versioning also prevents an old browser tab from overwriting a newer roster.
alter table public.teams add column roster_version bigint not null default 0;

create function public.bump_roster_version() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    update public.teams set roster_version = roster_version + 1 where id = old.team_id;
  elsif tg_op = 'UPDATE' and old.team_id <> new.team_id then
    -- Use the same lock order when moving a player between teams.
    perform id from public.teams where id in (old.team_id, new.team_id) order by id for update;
    update public.teams set roster_version = roster_version + 1 where id in (old.team_id, new.team_id);
  else
    update public.teams set roster_version = roster_version + 1 where id = new.team_id;
  end if;
  return null;
end;
$$;

revoke all on function public.bump_roster_version() from public, anon, authenticated;
create trigger players_roster_version after insert or update or delete on public.players
  for each row execute function public.bump_roster_version();

create function public.save_roster(
  p_team_id bigint, p_expected_version bigint, p_players jsonb, p_ip text default null
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  current_version bigint;
  row_data record;
begin
  select roster_version into current_version from public.teams where id = p_team_id for update;
  if not found then
    raise exception 'Команда не найдена' using errcode = 'P0002';
  end if;
  if p_expected_version is distinct from current_version then
    raise exception 'Состав уже изменён. Обновите страницу перед сохранением.' using errcode = '40001';
  end if;
  if p_players is null or jsonb_typeof(p_players) <> 'array' then
    raise exception 'Некорректный состав' using errcode = '22023';
  end if;
  if jsonb_array_length(p_players) > 64 then
    raise exception 'Слишком много игроков' using errcode = '22023';
  end if;
  -- Cast and validate the entire payload before changing any rows.
  if exists (
    select 1 from jsonb_to_recordset(p_players) as x(
      id bigint, nickname text, mmr integer, is_captain boolean, is_standin boolean, sort_order integer
    ) where (id is not null and id <= 0) or nickname is null or btrim(nickname) = ''
      or length(nickname) > 80 or mmr < 0 or mmr > 20000
      or is_captain is null or is_standin is null or sort_order is null or sort_order < 1
  ) or (select count(*) from jsonb_to_recordset(p_players) as x(is_captain boolean) where is_captain) > 1
    or (select count(*) <> count(distinct id) from jsonb_to_recordset(p_players) as x(id bigint) where id is not null)
    or (select count(*) <> count(distinct sort_order) from jsonb_to_recordset(p_players) as x(sort_order integer)) then
    raise exception 'Некорректные игроки, позиции или капитан' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_players) as x(id bigint)
    where x.id is not null and not exists (
      select 1 from public.players p where p.id = x.id and p.team_id = p_team_id
    )
  ) then
    raise exception 'Игрок не принадлежит этой команде. Обновите страницу.' using errcode = '23514';
  end if;

  -- Deleting a player uses the established ON DELETE SET NULL behavior for
  -- picks/awards. Reordering and editing preserve IDs and their references.
  delete from public.players p where p.team_id = p_team_id and not exists (
    select 1 from jsonb_to_recordset(p_players) as x(id bigint) where x.id = p.id
  );
  for row_data in select * from jsonb_to_recordset(p_players) as x(
    id bigint, nickname text, real_name text, role text, mmr integer,
    is_captain boolean, is_standin boolean, sort_order integer
  ) loop
    if row_data.id is null then
      insert into public.players(team_id, nickname, real_name, role, mmr, is_captain, is_standin, sort_order)
      values (p_team_id, btrim(row_data.nickname), row_data.real_name, row_data.role, row_data.mmr,
        row_data.is_captain, row_data.is_standin, row_data.sort_order);
    else
      update public.players set nickname = btrim(row_data.nickname), real_name = row_data.real_name,
        role = row_data.role, mmr = row_data.mmr, is_captain = row_data.is_captain,
        is_standin = row_data.is_standin, sort_order = row_data.sort_order
      where id = row_data.id and team_id = p_team_id;
    end if;
  end loop;
  -- Empty-to-empty saves also consume the submitted version.
  update public.teams set roster_version = roster_version + 1 where id = p_team_id;
  insert into public.audit_log(action, entity, entity_id, summary, payload, ip)
  values ('roster.replace', 'team', p_team_id, 'Состав сохранён: ' || jsonb_array_length(p_players) || ' игроков',
    jsonb_build_object('previous_version', current_version, 'players', p_players), p_ip);
end;
$$;

revoke all on function public.save_roster(bigint, bigint, jsonb, text) from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.save_roster(bigint, bigint, jsonb, text) to service_role;
  end if;
end;
$$;

-- ─── 0011_player_privacy.sql ─────────────────────────────────────

-- Legacy tournament snapshots contain private links, too. RLS protects rows;
-- column grants protect these fields even on published rosters and direct REST.
revoke select on public.players from public, anon, authenticated;
revoke select (real_name, steam_url, dotabuff_url) on public.players from public, anon, authenticated;
grant select (id, team_id, nickname, role, is_captain, is_standin, sort_order, mmr)
  on public.players to anon, authenticated;

-- No private columns are in the Realtime publication. New profile/contact
-- tables must also explicitly revoke the defaults introduced in 0006.

-- ─── 0012_registration_schema.sql ────────────────────────────────

-- Accounts and community teams are separate from immutable tournament snapshots.
create table public.disciplines (
  id text primary key,
  name text not null,
  metric text,
  check (metric is null or metric in ('mmr', 'elo'))
);
insert into public.disciplines values ('dota2','Dota 2','mmr'), ('cs2','CS2','elo'), ('other','Другая дисциплина',null);
alter table public.disciplines enable row level security;
create policy disciplines_read on public.disciplines for select using (true);

alter table public.tournaments
  add column discipline text not null default 'dota2' references public.disciplines(id),
  add column registration_open boolean not null default false,
  add column roster_size integer not null default 5 check (roster_size between 1 and 32),
  add column max_substitutes integer not null default 2 check (max_substitutes between 0 and 32);
update public.tournaments set discipline = case
  when lower(trim(game)) in ('dota 2','dota2') then 'dota2'
  when lower(trim(game)) in ('cs2','cs 2','counter-strike 2') then 'cs2'
  else 'other' end;

create table public.player_profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  code bigint generated always as identity unique,
  telegram_id text not null unique check (length(telegram_id) between 1 and 256),
  nickname text not null check (length(trim(nickname)) between 2 and 80),
  telegram_username text not null check (telegram_username ~ '^[A-Za-z0-9_]{5,32}$'),
  telegram_contact_verified boolean not null default false,
  steam_url text not null check (steam_url ~ '^https://steamcommunity\.com/(id/[A-Za-z0-9_-]+|profiles/[0-9]{17})$'),
  faceit_url text check (faceit_url is null or faceit_url ~ '^https://www\.faceit\.com/(en|ru)/players/[A-Za-z0-9_-]+$'),
  dotabuff_url text check (dotabuff_url is null or dotabuff_url ~ '^https://www\.dotabuff\.com/players/[0-9]+$'),
  version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_nickname on public.player_profiles(lower(nickname));
create index profiles_steam on public.player_profiles(steam_url);
create table public.player_ratings (
  profile_id uuid not null references public.player_profiles(id) on delete cascade,
  discipline text not null references public.disciplines(id),
  value integer not null check (value between 0 and 20000),
  primary key (profile_id,discipline),
  check (discipline in ('dota2','cs2'))
);
create table public.community_teams (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,59}$'),
  name text not null check (length(trim(name)) between 2 and 80),
  tag text check (length(tag) <= 12),
  description text check (length(description) <= 2000),
  main_captain uuid not null references public.player_profiles(id),
  second_captain uuid references public.player_profiles(id),
  archived boolean not null default false,
  version bigint not null default 0,
  created_at timestamptz not null default now(),
  check (main_captain is distinct from second_captain)
);
create table public.registration_teams (
  id bigint generated always as identity primary key,
  tournament_id bigint not null references public.tournaments(id),
  community_team_id bigint not null references public.community_teams(id),
  status text not null default 'draft' check (status in ('draft','submitted','accepted','rejected','waitlisted','withdrawn')),
  version bigint not null default 0,
  reason text,
  snapshot_team_id bigint references public.teams(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id,community_team_id)
);
create table public.team_members (
  id bigint generated always as identity primary key,
  registration_team_id bigint not null references public.registration_teams(id),
  tournament_id bigint not null references public.tournaments(id),
  profile_id uuid not null references public.player_profiles(id),
  slot text not null default 'main' check (slot in ('main','substitute')),
  active boolean not null default true,
  joined_at timestamptz not null default now(),
  unique (registration_team_id,profile_id)
);
create unique index one_active_team_per_tournament on public.team_members(tournament_id,profile_id) where active;
create index members_application on public.team_members(registration_team_id) where active;
create table public.team_invites (
  id bigint generated always as identity primary key,
  registration_team_id bigint not null references public.registration_teams(id),
  recipient_id uuid references public.player_profiles(id),
  token_hash text unique check (token_hash is null or token_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'active' check (status in ('active','revoked','accepted','rejected')),
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now(),
  check ((recipient_id is null) <> (token_hash is null))
);
create unique index one_personal_invite on public.team_invites(registration_team_id,recipient_id) where status='active' and recipient_id is not null;
create unique index one_active_link on public.team_invites(registration_team_id) where status='active' and token_hash is not null;
create table public.captain_requests (
  id bigint generated always as identity primary key,
  community_team_id bigint not null references public.community_teams(id),
  initiator_id uuid not null references public.player_profiles(id),
  recipient_id uuid not null references public.player_profiles(id),
  role text not null check (role in ('main','second')),
  status text not null default 'pending' check (status in ('pending','accepted','rejected','revoked')),
  expires_at timestamptz not null default now() + interval '7 days',
  check (initiator_id <> recipient_id)
);
create unique index one_captain_request on public.captain_requests(community_team_id,role) where status='pending';
create table public.participation_interests (
  tournament_id bigint not null references public.tournaments(id),
  profile_id uuid not null references public.player_profiles(id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (tournament_id,profile_id)
);
create table public.registration_revisions (
  id bigint generated always as identity primary key,
  registration_team_id bigint not null references public.registration_teams(id),
  version bigint not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
create table public.registration_events (
  id bigint generated always as identity primary key,
  community_team_id bigint references public.community_teams(id),
  registration_team_id bigint references public.registration_teams(id),
  profile_id uuid references public.player_profiles(id),
  action text not null,
  reason text,
  actor_kind text not null check (actor_kind in ('player','admin')),
  actor_id uuid references public.player_profiles(id),
  created_at timestamptz not null default now()
);
create table public.registration_limits (
  key text not null,
  bucket bigint not null,
  attempts integer not null default 1,
  primary key (key,bucket)
);
alter table public.teams add column community_team_id bigint references public.community_teams(id);
alter table public.players add column profile_id uuid references public.player_profiles(id),
  add column elo integer check (elo is null or elo between 0 and 20000);
grant select (elo) on public.players to anon,authenticated;
alter table public.audit_log add column actor_id uuid references public.player_profiles(id),
  add column actor_kind text not null default 'admin' check (actor_kind in ('admin','player','system'));

-- 0006 grants SELECT on new tables by default. Private data has NO direct read
-- or write policy, including for logged-in users. All authorization is server-side.
do $$ declare n text; begin
  foreach n in array array['player_profiles','player_ratings','community_teams','registration_teams','team_members','team_invites','captain_requests','participation_interests','registration_revisions','registration_events','registration_limits'] loop
    execute format('alter table public.%I enable row level security',n);
    execute format('revoke all on public.%I from public, anon, authenticated',n);
    execute format('grant all on public.%I to service_role',n);
  end loop;
end $$;

create function public.registration_throttle(p_key text,p_limit integer,p_window integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer; b bigint;
begin
  if length(p_key)>200 or p_limit<1 or p_window<1 then raise exception 'Invalid rate limit'; end if;
  b := floor(extract(epoch from clock_timestamp())/p_window);
  insert into public.registration_limits(key,bucket) values(p_key,b)
    on conflict(key,bucket) do update set attempts=public.registration_limits.attempts+1
    returning attempts into n;
  delete from public.registration_limits where bucket < floor(extract(epoch from clock_timestamp())/p_window)-2 and key=p_key;
  return n<=p_limit;
end $$;
revoke all on function public.registration_throttle(text,integer,integer) from public,anon,authenticated;
grant execute on function public.registration_throttle(text,integer,integer) to service_role;

-- ─── 0013_registration_commands.sql ──────────────────────────────

-- Only the service role may execute these transactions. The server supplies the
-- verified actor and admin flag; neither ever comes from a form or auth metadata.
create function public.registration_snapshot(p_application bigint) returns jsonb
language sql security invoker set search_path='' as $$
  select jsonb_build_object('team',jsonb_build_object('name',c.name,'tag',c.tag,'description',c.description),
    'players',coalesce((select jsonb_agg(jsonb_build_object('profile_id',p.id,'version',p.version,
      'nickname',p.nickname,'telegram_username',p.telegram_username,'steam_url',p.steam_url,
      'dotabuff_url',p.dotabuff_url,'faceit_url',p.faceit_url,'slot',m.slot,
      'rating',(select value from public.player_ratings where profile_id=p.id and discipline=t.discipline))
      order by m.slot,m.id) from public.team_members m join public.player_profiles p on p.id=m.profile_id
      where m.registration_team_id=r.id and m.active),'[]'::jsonb))
  from public.registration_teams r join public.community_teams c on c.id=r.community_team_id
  join public.tournaments t on t.id=r.tournament_id where r.id=p_application;
$$;

create function public.sync_registration_snapshot(p_application bigint) returns void
language plpgsql security invoker set search_path='' as $$
declare r public.registration_teams; c public.community_teams; t public.tournaments; v_team bigint; m record; n integer:=0;
begin
  select * into strict r from public.registration_teams where id=p_application;
  if r.status<>'accepted' then return; end if;
  select * into strict c from public.community_teams where id=r.community_team_id;
  select * into strict t from public.tournaments where id=r.tournament_id;
  v_team:=r.snapshot_team_id;
  if v_team is null then
    insert into public.teams(tournament_id,slug,name,tag,description,community_team_id)
      values(t.id,c.slug||'-r'||r.id,c.name,c.tag,c.description,c.id) returning id into v_team;
    update public.registration_teams set snapshot_team_id=v_team where id=r.id;
  end if;
  delete from public.players p where team_id=v_team and not exists
    (select 1 from public.team_members tm where tm.registration_team_id=r.id and tm.active and tm.profile_id=p.profile_id);
  for m in select p.*,tm.slot,(select value from public.player_ratings where profile_id=p.id and discipline=t.discipline) rating
    from public.team_members tm join public.player_profiles p on p.id=tm.profile_id
    where tm.registration_team_id=r.id and tm.active order by tm.slot,tm.id loop
    -- Existing snapshot fields stay as reviewed. An admin changing another
    -- member must not silently refresh this player's nickname/links/rating.
    update public.players set is_standin=(m.slot='substitute'),sort_order=n
      where team_id=v_team and profile_id=m.id;
    if not found then
      insert into public.players(team_id,profile_id,nickname,steam_url,dotabuff_url,is_captain,is_standin,sort_order,mmr,elo)
        values(v_team,m.id,m.nickname,m.steam_url,m.dotabuff_url,m.id=c.main_captain and not exists(select 1 from public.players where team_id=v_team and is_captain),m.slot='substitute',n,
          case when t.discipline='dota2' then m.rating else null end,case when t.discipline='cs2' then m.rating else null end);
    end if;
    n:=n+1;
  end loop;
end $$;

create function public.register_player(p_user uuid,p_telegram_id text,p_verified_username text,p_profile jsonb,p_ip text default null)
returns uuid language plpgsql security invoker set search_path='' as $$
declare old public.player_profiles;
begin
  perform pg_advisory_xact_lock(194713,1);
  select * into old from public.player_profiles where id=p_user;
  if found then
    if old.telegram_id<>p_telegram_id then raise exception 'Telegram identity mismatch'; end if;
    return old.id;
  end if;
  insert into public.player_profiles(id,telegram_id,nickname,telegram_username,telegram_contact_verified,steam_url,faceit_url,dotabuff_url)
    values(p_user,p_telegram_id,p_profile->>'nickname',p_profile->>'telegram_username',
      lower(p_profile->>'telegram_username')=lower(coalesce(p_verified_username,'')),p_profile->>'steam_url',p_profile->>'faceit_url',p_profile->>'dotabuff_url');
  if p_profile->>'dota_mmr' is not null then insert into public.player_ratings values(p_user,'dota2',(p_profile->>'dota_mmr')::integer); end if;
  if p_profile->>'cs_elo' is not null then insert into public.player_ratings values(p_user,'cs2',(p_profile->>'cs_elo')::integer); end if;
  insert into public.audit_log(action,entity,actor_kind,actor_id,ip,summary) values('player.register','profile','player',p_user,p_ip,'Создан профиль игрока');
  return p_user;
end $$;

create function public.registration_command(p_actor uuid,p_admin boolean,p_action text,p_input jsonb,p_ip text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  r public.registration_teams; c public.community_teams; t public.tournaments;
  inv public.team_invites; req public.captain_requests; old public.player_profiles;
  v_id bigint; v_profile uuid; v_old_app bigint; v_slot text; v_count integer; v_main integer;
  v_captain boolean:=false; v_payload jsonb:='{}'; v_changed boolean; v_rating_dota integer; v_rating_cs integer;
begin
  -- Serializing this small control plane makes membership/capacity/role changes
  -- atomic across applications, including concurrent invites and admin moves.
  perform pg_advisory_xact_lock(194713,1);
  if p_admin is null or (not p_admin and not exists(select 1 from public.player_profiles where id=p_actor)) then
    raise exception using errcode='42501',message='Требуется аккаунт игрока';
  end if;
  if p_input ? 'application_id' then
    select * into r from public.registration_teams where id=(p_input->>'application_id')::bigint for update;
    if not found then raise exception 'Заявка не найдена'; end if;
  end if;
  if p_action in ('invite_accept','invite_decline','invite_revoke') then
    select * into inv from public.team_invites where
      (p_input->>'token_hash' is not null and token_hash=p_input->>'token_hash') or
      (p_input->>'invite_id' is not null and id=(p_input->>'invite_id')::bigint) for update;
    if not found then raise exception 'Приглашение не найдено'; end if;
    if r.id is not null and r.id<>inv.registration_team_id then raise exception 'Чужое приглашение'; end if;
    select * into r from public.registration_teams where id=inv.registration_team_id for update;
  end if;
  if p_action in ('captain_accept','captain_decline','captain_revoke') then
    select * into req from public.captain_requests where id=(p_input->>'request_id')::bigint for update;
    if not found then raise exception 'Запрос не найден'; end if;
    select * into c from public.community_teams where id=req.community_team_id for update;
  elsif r.id is not null then select * into c from public.community_teams where id=r.community_team_id for update;
  elsif p_input ? 'team_id' then
    select * into c from public.community_teams where id=(p_input->>'team_id')::bigint for update;
    if not found then raise exception 'Команда не найдена'; end if;
  end if;
  if r.id is not null then select * into t from public.tournaments where id=r.tournament_id for update;
  elsif p_input ? 'tournament_id' then
    select * into t from public.tournaments where id=(p_input->>'tournament_id')::bigint for update;
    if not found or t.status='draft' then raise exception 'Турнир не найден'; end if;
  end if;
  v_captain:=coalesce(p_admin or (c.id is not null and (c.main_captain=p_actor or c.second_captain=p_actor)),false);
  if r.id is not null and p_input ? 'version' and r.version<>(p_input->>'version')::bigint then
    raise exception using errcode='40001',message='Заявка уже изменена. Обновите страницу';
  end if;
  if c.id is not null and p_input ? 'team_version' and c.version<>(p_input->>'team_version')::bigint then
    raise exception using errcode='40001',message='Команда уже изменена. Обновите страницу';
  end if;

  case p_action
  when 'profile_update' then
    select * into strict old from public.player_profiles where id=p_actor;
    if old.version<>(p_input->>'version')::bigint then raise exception 'Профиль уже изменён. Обновите страницу'; end if;
    select value into v_rating_dota from public.player_ratings where profile_id=p_actor and discipline='dota2';
    select value into v_rating_cs from public.player_ratings where profile_id=p_actor and discipline='cs2';
    v_changed:=old.nickname is distinct from p_input->>'nickname' or old.telegram_username is distinct from p_input->>'telegram_username'
      or old.steam_url is distinct from p_input->>'steam_url' or old.faceit_url is distinct from p_input->>'faceit_url' or old.dotabuff_url is distinct from p_input->>'dotabuff_url';
    update public.player_profiles set nickname=p_input->>'nickname',telegram_username=p_input->>'telegram_username',
      telegram_contact_verified=lower(p_input->>'telegram_username')=lower(coalesce(p_input->>'verified_username','')),
      steam_url=p_input->>'steam_url',faceit_url=p_input->>'faceit_url',dotabuff_url=p_input->>'dotabuff_url',version=version+1,updated_at=now() where id=p_actor;
    delete from public.player_ratings where profile_id=p_actor;
    if p_input->>'dota_mmr' is not null then insert into public.player_ratings values(p_actor,'dota2',(p_input->>'dota_mmr')::integer); end if;
    if p_input->>'cs_elo' is not null then insert into public.player_ratings values(p_actor,'cs2',(p_input->>'cs_elo')::integer); end if;
    update public.registration_teams a set status=case when a.status in ('submitted','waitlisted') then 'draft' else a.status end,version=a.version+1,updated_at=now()
      from public.tournaments tt where tt.id=a.tournament_id and a.status not in ('accepted','withdrawn')
      and exists(select 1 from public.team_members m where m.registration_team_id=a.id and m.profile_id=p_actor and m.active)
      and (v_changed or (tt.discipline='dota2' and v_rating_dota is distinct from (p_input->>'dota_mmr')::integer)
        or (tt.discipline='cs2' and v_rating_cs is distinct from (p_input->>'cs_elo')::integer));
  when 'team_create' then
    insert into public.community_teams(slug,name,tag,description,main_captain)
      values(p_input->>'slug',p_input->>'name',p_input->>'tag',p_input->>'description',p_actor) returning * into c;
    v_payload:=jsonb_build_object('team_id',c.id,'slug',c.slug);
  when 'team_update' then
    if not v_captain or c.archived then raise exception 'Нет прав управления командой'; end if;
    update public.community_teams set name=p_input->>'name',tag=p_input->>'tag',description=p_input->>'description',version=version+1 where id=c.id;
    update public.registration_teams set status=case when status in ('submitted','waitlisted') then 'draft' else status end,version=version+1
      where community_team_id=c.id and status not in ('accepted','withdrawn');
  when 'team_archive','team_restore' then
    if not p_admin and c.main_captain is distinct from p_actor then raise exception 'Только главный капитан может закрыть команду'; end if;
    if p_action='team_restore' and not p_admin then raise exception 'Восстановление доступно организатору'; end if;
    if not p_admin and exists(select 1 from public.registration_teams a join public.tournaments tt on tt.id=a.tournament_id
      where a.community_team_id=c.id and a.status<>'withdrawn' and (a.status<>'accepted' or tt.status<>'finished')) then
      raise exception 'Сначала отзовите непринятые заявки. С активным принятым участием обратитесь к организатору';
    end if;
    update public.community_teams set archived=(p_action='team_archive'),version=version+1 where id=c.id;
    update public.team_invites set status='revoked' where status='active' and registration_team_id in(select id from public.registration_teams where community_team_id=c.id);
  when 'application_create' then
    if not v_captain or c.archived or (not p_admin and (not t.registration_open or t.status='finished')) then raise exception 'Создание заявки недоступно'; end if;
    insert into public.registration_teams(tournament_id,community_team_id) values(t.id,c.id)
      on conflict(tournament_id,community_team_id) do update set status=case when registration_teams.status='withdrawn' then 'draft' else registration_teams.status end,
        version=registration_teams.version+case when registration_teams.status='withdrawn' then 1 else 0 end returning * into r;
    v_payload:=jsonb_build_object('application_id',r.id);
  when 'interest' then
    if t.id is null or (not t.registration_open or t.status='finished') and (p_input->>'active')::boolean then raise exception 'Приём пожеланий закрыт'; end if;
    insert into public.participation_interests(tournament_id,profile_id,active) values(t.id,p_actor,(p_input->>'active')::boolean)
      on conflict(tournament_id,profile_id) do update set active=excluded.active;
  when 'invite_create','invite_revoke' then
    if not v_captain or c.archived or r.id is null then raise exception 'Нет прав на приглашения'; end if;
    if p_action='invite_create' then
      if not p_admin and (not t.registration_open or t.status='finished' or r.status in ('accepted','withdrawn')) then raise exception 'Состав заблокирован'; end if;
      if p_input->>'recipient_id' is null then
        update public.team_invites set status='revoked' where registration_team_id=r.id and status='active' and token_hash is not null;
      else
        update public.team_invites set status='revoked' where registration_team_id=r.id and status='active' and recipient_id=(p_input->>'recipient_id')::uuid;
      end if;
      insert into public.team_invites(registration_team_id,recipient_id,token_hash) values(r.id,(p_input->>'recipient_id')::uuid,p_input->>'token_hash') returning id into v_id;
      v_payload:=jsonb_build_object('invite_id',v_id);
    else update public.team_invites set status='revoked' where id=inv.id; end if;
  when 'invite_accept','invite_decline','self_join' then
    if p_action<>'self_join' and inv.recipient_id is not null and inv.recipient_id<>p_actor then raise exception 'Это приглашение другому игроку'; end if;
    if p_action='invite_decline' then
      if inv.recipient_id is null then raise exception 'Ссылку можно только не принимать'; end if;
      if inv.status<>'active' then raise exception 'Приглашение недоступно'; end if;
      update public.team_invites set status='rejected' where id=inv.id;
    else
      if exists(select 1 from public.team_members where registration_team_id=r.id and profile_id=p_actor and active) then return jsonb_build_object('application_id',r.id); end if;
      if c.archived or not t.registration_open or t.status='finished' or r.status in ('accepted','withdrawn') then raise exception 'Состав заблокирован'; end if;
      if p_action='self_join' and not v_captain then raise exception 'Требуется приглашение'; end if;
      if p_action='invite_accept' and (inv.status<>'active' or inv.expires_at<=now()) then raise exception 'Срок приглашения истёк или оно отозвано'; end if;
      if exists(select 1 from public.team_members where tournament_id=t.id and profile_id=p_actor and active) then raise exception 'Вы уже в другом составе этого турнира'; end if;
      select count(*),count(*) filter(where slot='main') into v_count,v_main from public.team_members where registration_team_id=r.id and active;
      if v_count>=t.roster_size+t.max_substitutes then raise exception 'В составе нет свободных мест'; end if;
      v_slot:=case when v_main<t.roster_size then 'main' else 'substitute' end;
      insert into public.team_members(registration_team_id,tournament_id,profile_id,slot) values(r.id,t.id,p_actor,v_slot)
        on conflict(registration_team_id,profile_id) do update set active=true,slot=excluded.slot,joined_at=now();
      if inv.recipient_id is not null then update public.team_invites set status='accepted' where id=inv.id; end if;
      update public.registration_teams set status=case when status in ('submitted','waitlisted') then 'draft' else status end,version=version+1,updated_at=now() where id=r.id;
    end if;
  when 'member_slot','member_remove','member_leave','admin_member' then
    if r.id is null then raise exception 'Заявка не найдена'; end if;
    if p_action='admin_member' and not p_admin then raise exception 'Только организатор может добавлять напрямую'; end if;
    if not p_admin and (c.archived or not t.registration_open or t.status='finished' or r.status in ('accepted','withdrawn')) then raise exception 'Состав заблокирован'; end if;
    if p_action<>'member_leave' and not v_captain then raise exception 'Нет прав на состав'; end if;
    v_profile:=case when p_action='member_leave' then p_actor else (p_input->>'profile_id')::uuid end;
    if p_action in ('member_remove','member_leave') then
      update public.team_members set active=false where registration_team_id=r.id and profile_id=v_profile and active;
      if not found then raise exception 'Игрок не найден в составе'; end if;
    else
      v_slot:=p_input->>'slot';
      if v_slot not in ('main','substitute') or v_slot is null then raise exception 'Неверный слот'; end if;
      if p_action='admin_member' then
        if p_input->>'replace_profile_id' is not null then
          update public.team_members set active=false where registration_team_id=r.id and profile_id=(p_input->>'replace_profile_id')::uuid;
          if not found then raise exception 'Заменяемый игрок не найден в составе'; end if;
        end if;
        select registration_team_id into v_old_app from public.team_members where tournament_id=t.id and profile_id=v_profile and active;
        if v_old_app is not null and v_old_app<>r.id then
          update public.team_members set active=false where tournament_id=t.id and profile_id=v_profile and active;
          update public.registration_teams set status=case when status in ('submitted','waitlisted') then 'draft' else status end,version=version+1 where id=v_old_app;
          perform public.sync_registration_snapshot(v_old_app);
          insert into public.registration_events(registration_team_id,profile_id,action,reason,actor_kind) values(v_old_app,v_profile,'admin_move',p_input->>'reason','admin');
        end if;
      elsif not exists(select 1 from public.team_members where registration_team_id=r.id and profile_id=v_profile and active) then raise exception 'Игрок не найден в составе'; end if;
      select count(*),count(*) filter(where slot='main') into v_count,v_main from public.team_members where registration_team_id=r.id and active and profile_id<>v_profile;
      if v_count>=t.roster_size+t.max_substitutes or (v_slot='main' and v_main>=t.roster_size)
        or (v_slot='substitute' and v_count-v_main>=t.max_substitutes) then raise exception 'Нет свободного места выбранного типа'; end if;
      insert into public.team_members(registration_team_id,tournament_id,profile_id,slot) values(r.id,t.id,v_profile,v_slot)
        on conflict(registration_team_id,profile_id) do update set active=true,slot=excluded.slot,joined_at=now();
    end if;
    update public.registration_teams set status=case when status in ('submitted','waitlisted') then 'draft' else status end,version=version+1,updated_at=now() where id=r.id;
    if p_admin then perform public.sync_registration_snapshot(r.id); end if;
  when 'submit','withdraw','review' then
    if not v_captain then raise exception 'Нет прав на заявку'; end if;
    if p_action='review' and not p_admin then raise exception 'Только организатор может рассматривать заявку'; end if;
    if p_action='withdraw' then
      if r.status='accepted' then raise exception 'Принятую заявку меняет организатор'; end if;
      update public.registration_teams set status='withdrawn',version=version+1,updated_at=now() where id=r.id;
      update public.team_members set active=false where registration_team_id=r.id;
      update public.team_invites set status='revoked' where registration_team_id=r.id and status='active';
    else
      if p_action='submit' and (c.archived or not t.registration_open or t.status='finished' or r.status in ('accepted','withdrawn')) then raise exception 'Подача заявки недоступна'; end if;
      if p_action='review' and (p_input->>'status' not in ('accepted','rejected','waitlisted') or r.status not in ('submitted','waitlisted','rejected')) then raise exception 'Заявка не ожидает решения'; end if;
      if p_action='submit' or p_input->>'status'='accepted' then
        select count(*),count(*) filter(where slot='main') into v_count,v_main from public.team_members where registration_team_id=r.id and active;
        if v_main<>t.roster_size or v_count-v_main>t.max_substitutes then raise exception 'Нужно % основных и не более % запасных',t.roster_size,t.max_substitutes; end if;
      end if;
      if p_action='review' and p_input->>'status'='rejected' and length(trim(coalesce(p_input->>'reason','')))=0 then raise exception 'Укажите причину отказа'; end if;
      update public.registration_teams set status=case when p_action='submit' then 'submitted' else p_input->>'status' end,
        reason=case when p_action='review' then p_input->>'reason' else null end,version=version+1,updated_at=now() where id=r.id;
      insert into public.registration_revisions(registration_team_id,version,snapshot)
        select r.id,a.version,public.registration_snapshot(r.id) from public.registration_teams a where a.id=r.id;
      perform public.sync_registration_snapshot(r.id);
    end if;
  when 'captain_request','captain_direct','second_remove' then
    if not p_admin and c.main_captain is distinct from p_actor then raise exception 'Только главный капитан управляет ролями'; end if;
    if c.archived and not p_admin then raise exception 'Команда закрыта'; end if;
    if p_action='second_remove' then update public.community_teams set second_captain=null,version=version+1 where id=c.id;
    else
      v_profile:=(p_input->>'recipient_id')::uuid;
      if v_profile is null or not exists(select 1 from public.player_profiles where id=v_profile) then raise exception 'Игрок не найден'; end if;
      if p_input->>'role' not in ('main','second') then raise exception 'Неизвестная роль'; end if;
      if v_profile=c.main_captain and p_input->>'role'='second' then raise exception 'Капитаны должны быть разными игроками'; end if;
      if p_action='captain_direct' then
        if not p_admin then raise exception 'Только организатор назначает напрямую'; end if;
        update public.community_teams set main_captain=case when p_input->>'role'='main' then v_profile else main_captain end,
          second_captain=case when p_input->>'role'='second' then v_profile when second_captain=v_profile then null else second_captain end,version=version+1 where id=c.id;
        update public.captain_requests set status='revoked' where community_team_id=c.id and status='pending';
      else
        if v_profile=p_actor then raise exception 'Нельзя назначить себя'; end if;
        update public.captain_requests set status='revoked' where community_team_id=c.id and role=p_input->>'role' and status='pending';
        insert into public.captain_requests(community_team_id,initiator_id,recipient_id,role) values(c.id,p_actor,v_profile,p_input->>'role');
      end if;
    end if;
  when 'captain_accept','captain_decline','captain_revoke' then
    if req.status<>'pending' then raise exception 'Запрос недоступен'; end if;
    if p_action='captain_revoke' then
      if not p_admin and c.main_captain is distinct from p_actor then raise exception 'Нет прав на отзыв'; end if;
      update public.captain_requests set status='revoked' where id=req.id;
    else
      if req.recipient_id is distinct from p_actor then raise exception 'Запрос другому игроку'; end if;
      if req.expires_at<=now() or c.archived or c.main_captain<>req.initiator_id then raise exception 'Запрос истёк или инициатор уже не капитан'; end if;
      if p_action='captain_accept' then
        update public.community_teams set main_captain=case when req.role='main' then p_actor else main_captain end,
          second_captain=case when req.role='second' then p_actor when second_captain=p_actor then null else second_captain end,version=version+1 where id=c.id;
        update public.captain_requests set status='revoked' where community_team_id=c.id and status='pending' and id<>req.id;
      end if;
      update public.captain_requests set status=case when p_action='captain_accept' then 'accepted' else 'rejected' end where id=req.id;
    end if;
  else raise exception 'Неизвестное действие';
  end case;

  insert into public.audit_log(action,entity,entity_id,actor_kind,actor_id,ip,summary,payload)
    values('registration.'||p_action,'registration',r.id,case when p_admin then 'admin' else 'player' end,p_actor,p_ip,
      coalesce(p_input->>'reason',p_action),jsonb_build_object('application_id',r.id,'community_team_id',c.id,'profile_id',v_profile));
  insert into public.registration_events(community_team_id,registration_team_id,profile_id,action,reason,actor_kind,actor_id)
    values(c.id,r.id,coalesce(v_profile,p_actor),p_action,p_input->>'reason',case when p_admin then 'admin' else 'player' end,p_actor);
  return v_payload||jsonb_build_object('application_id',r.id,'team_id',c.id,'slug',c.slug,'tournament_slug',t.slug);
end $$;

revoke all on function public.registration_snapshot(bigint),public.sync_registration_snapshot(bigint),public.register_player(uuid,text,text,jsonb,text),public.registration_command(uuid,boolean,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.registration_snapshot(bigint),public.sync_registration_snapshot(bigint),public.register_player(uuid,text,text,jsonb,text),public.registration_command(uuid,boolean,text,jsonb,text) to service_role;

create function public.public_community_team(p_slug text) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('id',c.id,'slug',c.slug,'name',c.name,'tag',c.tag,'description',c.description,'archived',c.archived,
    'main_captain',(select jsonb_build_object('nickname',nickname,'code',code) from public.player_profiles where id=c.main_captain),
    'second_captain',(select jsonb_build_object('nickname',nickname,'code',code) from public.player_profiles where id=c.second_captain),
    'participations',coalesce((select jsonb_agg(jsonb_build_object('name',t.name,'slug',t.slug,'team_slug',s.slug) order by t.id desc)
      from public.registration_teams r join public.tournaments t on t.id=r.tournament_id join public.teams s on s.id=r.snapshot_team_id
      where r.community_team_id=c.id and r.status='accepted' and t.status<>'draft'),'[]'::jsonb))
    from public.community_teams c where c.slug=p_slug and length(p_slug)<=60;
$$;
revoke all on function public.public_community_team(text) from public;
grant execute on function public.public_community_team(text) to anon,authenticated,service_role;

-- ─── 0014_registration_reads.sql ─────────────────────────────────

-- Views retain their original columns when a source table grows. Append the
-- new tournament settings without changing the existing view column order.
create or replace view public.tournament_summaries with (security_invoker=true) as
select t.id,t.slug,t.name,t.edition,t.game,t.status,t.is_current,t.starts_at,t.ends_at,t.time_zone,
  t.format_summary,t.description,t.prize_pool,t.stream_url,t.telegram_url,t.logo_url,t.created_at,t.updated_at,
  (select count(*) from public.teams tm where tm.tournament_id=t.id) as team_count,
  (select count(*) from public.matches m where m.tournament_id=t.id) as match_count,
  (select coalesce(ch.name,p.team_label) from public.placements p left join public.teams ch on ch.id=p.team_id
    where p.tournament_id=t.id and p.place=1 limit 1) as champion_name,
  t.discipline,t.registration_open,t.roster_size,t.max_substitutes
from public.tournaments t;

create function public.search_registration_players(p_actor uuid,p_admin boolean,p_team bigint,p_query text)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
  if not coalesce(p_admin,false) and not exists(select 1 from public.community_teams where id=p_team and not archived
    and (main_captain=p_actor or second_captain=p_actor)) then raise exception using errcode='42501',message='Поиск доступен капитанам'; end if;
  if length(trim(p_query))<2 or length(p_query)>80 then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(to_jsonb(s)) from (select p.id,p.code,p.nickname,
    (select value from public.player_ratings where profile_id=p.id and discipline='dota2') as dota_mmr,
    (select value from public.player_ratings where profile_id=p.id and discipline='cs2') as cs_elo
    from public.player_profiles p where position(lower(p_query) in lower(p.nickname))>0 or 'P'||p.code::text=upper(p_query)
    order by lower(p.nickname),p.code limit 12) s),'[]'::jsonb);
end $$;
revoke all on function public.search_registration_players(uuid,boolean,bigint,text) from public,anon,authenticated;
grant execute on function public.search_registration_players(uuid,boolean,bigint,text) to service_role;

-- Keep cross-tournament membership impossible even for a mistaken service write.
create function public.check_member_tournament() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if not exists(select 1 from public.registration_teams where id=new.registration_team_id and tournament_id=new.tournament_id) then
    raise exception using errcode='23514',message='Состав относится к другому турниру';
  end if;
  return new;
end $$;
create trigger member_tournament before insert or update on public.team_members
  for each row execute function public.check_member_tournament();
revoke all on function public.check_member_tournament() from public,anon,authenticated;
grant execute on function public.check_member_tournament() to service_role;
