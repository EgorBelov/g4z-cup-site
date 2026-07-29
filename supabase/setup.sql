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
