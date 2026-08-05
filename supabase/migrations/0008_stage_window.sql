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
