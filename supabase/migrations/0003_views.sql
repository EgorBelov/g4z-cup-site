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
