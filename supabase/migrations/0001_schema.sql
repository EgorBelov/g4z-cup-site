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
