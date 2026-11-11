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
