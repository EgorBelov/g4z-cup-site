-- ============================================================================
-- Взнос турнира.
--
-- Организатор указывает взнос отдельным полем, а не строкой внутри описания:
-- на странице турнира это отдельная строка в блоке «О турнире». Значение —
-- свободный текст («1200 ₽ с человека»), потому что формулировки меняются от
-- сезона к сезону, а поле может остаться пустым, пока взнос не объявлен.
--
-- Данные: строка «Взнос …» вырезается из описаний. Само значение не переносится
-- автоматически — организатор заполняет поле в админке, когда сумма известна.
-- ============================================================================

alter table public.tournaments
  add column entry_fee text check (
    entry_fee is null or char_length(btrim(entry_fee)) between 1 and 120
  );

comment on column public.tournaments.entry_fee is
  'Взнос за участие, объявленный организатором. Свободный текст, может быть пустым.';

-- Убираем строку про взнос из описания: теперь это отдельное поле.
update public.tournaments
set description = nullif(
  btrim(regexp_replace(description, '(^|\r?\n)[ \t]*Взнос[^\r\n]*', '', 'gi')),
  ''
)
where description ~* '(^|\r?\n)[ \t]*Взнос';

-- Как и в 0017: новая колонка добавляется в конец, порядок существующих не
-- меняется, поэтому вьюху можно пересоздать без правки потребителей.
create or replace view public.tournament_summaries with (security_invoker=true) as
select t.id,t.slug,t.name,t.edition,t.game,t.status,t.is_current,t.starts_at,t.ends_at,t.time_zone,
  t.format_summary,t.description,t.prize_pool,t.stream_url,t.telegram_url,t.logo_url,t.created_at,t.updated_at,
  (select count(*) from public.teams tm where tm.tournament_id=t.id) as team_count,
  (select count(*) from public.matches m where m.tournament_id=t.id) as match_count,
  (select coalesce(ch.name,p.team_label) from public.placements p left join public.teams ch on ch.id=p.team_id
    where p.tournament_id=t.id and p.place=1 limit 1) as champion_name,
  t.discipline,t.registration_open,t.roster_size,t.max_substitutes,
  t.rating_team,t.rating_player,t.entry_fee
from public.tournaments t;
