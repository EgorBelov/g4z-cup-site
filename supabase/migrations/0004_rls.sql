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
