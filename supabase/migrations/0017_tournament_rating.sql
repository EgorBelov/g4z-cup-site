-- ============================================================================
-- Рейтинговые ориентиры турнира.
--
-- Организатор объявляет два справочных числа: общий рейтинг команды и рейтинг
-- на игрока. Это не ограничение и не проверка при приёме заявки — значения
-- показываются на странице заявки вместо прежнего «Рейтинг не обязателен».
--
-- Единицы зависят от дисциплины: MMR для Dota 2, Elo для CS2. Поэтому в базе
-- это просто целые числа без привязки к конкретной шкале.
-- ============================================================================

alter table public.tournaments
  add column rating_team integer check (
    rating_team is null or rating_team between 0 and 100000
  ),
  add column rating_player integer check (
    rating_player is null or rating_player between 0 and 20000
  );

comment on column public.tournaments.rating_team is
  'Общий рейтинг команды, объявленный организатором. Справочное значение.';
comment on column public.tournaments.rating_player is
  'Рейтинг на игрока, объявленный организатором. Справочное значение.';

-- Как и в 0014: новые колонки добавляются в конец, порядок существующих не
-- меняется, поэтому вьюху можно пересоздать без правки потребителей.
create or replace view public.tournament_summaries with (security_invoker=true) as
select t.id,t.slug,t.name,t.edition,t.game,t.status,t.is_current,t.starts_at,t.ends_at,t.time_zone,
  t.format_summary,t.description,t.prize_pool,t.stream_url,t.telegram_url,t.logo_url,t.created_at,t.updated_at,
  (select count(*) from public.teams tm where tm.tournament_id=t.id) as team_count,
  (select count(*) from public.matches m where m.tournament_id=t.id) as match_count,
  (select coalesce(ch.name,p.team_label) from public.placements p left join public.teams ch on ch.id=p.team_id
    where p.tournament_id=t.id and p.place=1 limit 1) as champion_name,
  t.discipline,t.registration_open,t.roster_size,t.max_substitutes,
  t.rating_team,t.rating_player
from public.tournaments t;
