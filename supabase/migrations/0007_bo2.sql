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
