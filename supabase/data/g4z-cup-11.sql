-- ============================================================================
-- G4Z CUP 11 — заявка и структура турнира.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/data/g4z-cup-11.sql
--
-- Формат:
--   3–7 августа  групповой этап, две группы по 4 команды, круговой bo2;
--   7 августа    стыковые матчи — 3-и и 4-е места крест-накрест между группами
--                за два оставшихся слота (bo3);
--   8–9 августа  плей-офф на шесть команд: первые места сразу в полуфинал,
--                вторые и победители стыковых — в четвертьфинал (bo3),
--                плюс матч за 3 место.
--
-- Часы матчей не проставляются: организаторы назначают их по ходу, поэтому у
-- матчей `scheduled_at` пустой, а даты живут окном на этапе (`starts_on`/
-- `ends_on`, миграция 0008).
--
-- Составы и MMR — как их прислали организаторы. Файл можно применять повторно:
-- турнир, этапы и составы перезаписываются, а матчи каждого этапа создаются
-- только если их ещё нет, чтобы не потерять уже сыгранные карты.
-- ============================================================================

do $$
declare
  v_tid         bigint;
  v_stage       bigint;
  v_playin      bigint;
  v_playoff     bigint;
  v_group       bigint;
  v_team        bigint;
  v_squad       jsonb;
  v_player      jsonb;
  v_idx         integer;
  v_name        text;
  v_group_teams bigint[];
  v_pair        integer[];
  v_playin1     bigint;
  v_playin2     bigint;
  v_qf1         bigint;
  v_qf2         bigint;
  v_sf1         bigint;
  v_sf2         bigint;
  v_final       bigint;
  v_third       bigint;
  -- Круговой этап для четырёх команд: три тура, в каждом по два матча.
  v_pairs       integer[][] := array[
    [1, 1, 1, 2], [1, 2, 3, 4],
    [2, 1, 1, 3], [2, 2, 4, 2],
    [3, 1, 1, 4], [3, 2, 2, 3]
  ];
  v_squads      jsonb := $json$
  [
    {
      "group": "Группа A", "slug": "error-404", "name": "Team ERROR 404", "seed": 1,
      "players": [
        {"nick": "vino5856", "mmr": 5700},
        {"nick": "yume2.0", "mmr": 4500},
        {"nick": "kokokopro", "mmr": 7500},
        {"nick": "ubilmarka", "mmr": 4300},
        {"nick": "starcy", "mmr": 5100}
      ]
    },
    {
      "group": "Группа A", "slug": "tropikal", "name": "Team ТРОПИКАЛ", "seed": 2,
      "players": [
        {"nick": "AI_Avenger", "mmr": 5500},
        {"nick": "the rest of us", "mmr": 2900},
        {"nick": "Ульянка ЛУЛУ PRIME", "mmr": 6000},
        {"nick": "l1’", "mmr": 3450},
        {"nick": "pıʞ ɔıuɐɥɔǝɯ", "mmr": 4500}
      ]
    },
    {
      "group": "Группа A", "slug": "ubity-no-ne-vami", "name": "Team УБИТЫ НО НЕ ВАМИ", "seed": 3,
      "players": [
        {"nick": "Приверженец самоалогии", "mmr": 7000},
        {"nick": "Икарус", "mmr": 7000},
        {"nick": "Бурмалдини", "mmr": 5600},
        {"nick": "Витёк)", "mmr": 6500},
        {"nick": "broodmaxcloud", "mmr": 4300}
      ]
    },
    {
      "group": "Группа A", "slug": "umbrella-corp", "name": "Team UMBRELLA CORP.", "seed": 4,
      "players": [
        {"nick": "social media killed romance", "mmr": 6800},
        {"nick": "marylinemonroe", "mmr": 6000},
        {"nick": "Obey your master", "mmr": 6700},
        {"nick": "kusya", "mmr": 4900},
        {"nick": "Hunger", "mmr": 4700}
      ]
    },
    {
      "group": "Группа B", "slug": "rehub", "name": "Team REHUB", "seed": 5,
      "players": [
        {"nick": "Rickey F", "mmr": 7100},
        {"nick": "Bodhiq", "mmr": 7100},
        {"nick": "Monolll", "mmr": 5600},
        {"nick": "Annimir", "mmr": 5220},
        {"nick": "Guilty pleasure", "mmr": 5400}
      ]
    },
    {
      "group": "Группа B", "slug": "4atta-s-knopkou", "name": "Team 4aTTa C KHoTTkOu", "seed": 6,
      "players": [
        {"nick": "mifimov345", "mmr": 6000},
        {"nick": "пекарь", "mmr": 5800},
        {"nick": "Толик", "mmr": 4600},
        {"nick": "Xardex", "mmr": 5700},
        {"nick": "cuck_2", "mmr": 5700}
      ]
    },
    {
      "group": "Группа B", "slug": "spirt-3-0", "name": "Team SPIRT 3.0", "seed": 7,
      "players": [
        {"nick": "lerc0re", "mmr": 4800},
        {"nick": "common", "mmr": 4000},
        {"nick": "sensitive", "mmr": 9100},
        {"nick": "нежить", "mmr": 5600},
        {"nick": "ЕБАНТЯЙ", "mmr": 5900}
      ]
    },
    {
      "group": "Группа B", "slug": "g4ziki", "name": "Team G4ZIKI", "seed": 8,
      "players": [
        {"nick": "gotika", "mmr": 8000},
        {"nick": "ЯНДЕКСКУРЬЕР ENJOIER", "mmr": 4000},
        {"nick": "коди это я бро", "mmr": 7000},
        {"nick": "hisoka", "mmr": 3500},
        {"nick": "venikpro", "mmr": 3000}
      ]
    }
  ]
  $json$::jsonb;
begin
  -- ─── турнир ───────────────────────────────────────────────────────────────

  insert into public.tournaments (
    slug, name, edition, status, is_current, starts_at, ends_at, time_zone,
    format_summary, description, stream_url, telegram_url
  ) values (
    'g4z-cup-11', 'G4Z CUP 11', 11, 'live', true,
    '2026-08-03 00:00:00+03', '2026-08-09 23:59:00+03', 'Europe/Moscow',
    'Две группы по 4 команды, круговой этап bo2. Напрямую в плей-офф выходят '
      || 'первые два места, третьи и четвёртые играют стыковые матчи между '
      || 'группами за оставшиеся слоты. Плей-офф — bo3, шесть команд.',
    'Одиннадцатый турнир G4Z CUP по Dota 2.',
    'https://www.twitch.tv/g4zcup_ru',
    'https://t.me/g4zagzes'
  )
  on conflict (slug) do update set
    name = excluded.name,
    edition = excluded.edition,
    status = excluded.status,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    format_summary = excluded.format_summary,
    description = excluded.description
  returning id into v_tid;

  -- Текущим показывается ровно один турнир.
  update public.tournaments set is_current = false
    where is_current and id <> v_tid;
  update public.tournaments set is_current = true where id = v_tid;

  -- ─── этапы ────────────────────────────────────────────────────────────────

  select id into v_stage
  from public.stages
  where tournament_id = v_tid and kind = 'round_robin'
  limit 1;

  if v_stage is null then
    insert into public.stages (
      tournament_id, kind, name, sort_order, best_of,
      advance_count, playin_count, starts_on, ends_on
    )
    values (v_tid, 'round_robin', 'Групповой этап', 1, 2, 2, 2, '2026-08-03', '2026-08-07')
    returning id into v_stage;
  else
    update public.stages set
      best_of = 2, advance_count = 2, playin_count = 2,
      starts_on = '2026-08-03', ends_on = '2026-08-07'
    where id = v_stage;
  end if;

  select id into v_playin
  from public.stages
  where tournament_id = v_tid and name = 'Стыковые матчи'
  limit 1;

  if v_playin is null then
    insert into public.stages (
      tournament_id, kind, name, sort_order, best_of, starts_on, ends_on
    )
    values (v_tid, 'single_elim', 'Стыковые матчи', 2, 3, '2026-08-07', '2026-08-07')
    returning id into v_playin;
  else
    update public.stages set
      best_of = 3, sort_order = 2, starts_on = '2026-08-07', ends_on = '2026-08-07'
    where id = v_playin;
  end if;

  select id into v_playoff
  from public.stages
  where tournament_id = v_tid and name = 'Плей-офф'
  limit 1;

  if v_playoff is null then
    insert into public.stages (
      tournament_id, kind, name, sort_order, best_of, starts_on, ends_on
    )
    values (v_tid, 'single_elim', 'Плей-офф', 3, 3, '2026-08-08', '2026-08-09')
    returning id into v_playoff;
  else
    update public.stages set
      best_of = 3, sort_order = 3, starts_on = '2026-08-08', ends_on = '2026-08-09'
    where id = v_playoff;
  end if;

  -- ─── группы ───────────────────────────────────────────────────────────────

  for v_idx in 1 .. 2 loop
    v_name := (array['Группа A', 'Группа B'])[v_idx];

    if not exists (
      select 1 from public.groups g where g.stage_id = v_stage and g.name = v_name
    ) then
      insert into public.groups (tournament_id, stage_id, name, sort_order)
      values (v_tid, v_stage, v_name, v_idx);
    end if;
  end loop;

  -- ─── команды и составы ────────────────────────────────────────────────────

  for v_squad in select * from jsonb_array_elements(v_squads) loop
    select g.id into v_group
    from public.groups g
    where g.stage_id = v_stage and g.name = v_squad ->> 'group';

    insert into public.teams (tournament_id, slug, name, seed, group_id)
    values (
      v_tid, v_squad ->> 'slug', v_squad ->> 'name',
      (v_squad ->> 'seed')::integer, v_group
    )
    on conflict (tournament_id, slug) do update set
      name = excluded.name,
      seed = excluded.seed,
      group_id = excluded.group_id
    returning id into v_team;

    -- Состав объявляется целиком, поэтому он перезаписывается.
    delete from public.players p where p.team_id = v_team;

    v_idx := 0;
    for v_player in select * from jsonb_array_elements(v_squad -> 'players') loop
      v_idx := v_idx + 1;
      insert into public.players (team_id, nickname, mmr, sort_order)
      values (v_team, v_player ->> 'nick', (v_player ->> 'mmr')::integer, v_idx);
    end loop;
  end loop;

  -- ─── расписание группового этапа ──────────────────────────────────────────

  if exists (select 1 from public.matches m where m.stage_id = v_stage) then
    raise notice 'Матчи группового этапа уже созданы — расписание не трогаем.';
  else
    for v_group in
      select g.id from public.groups g where g.stage_id = v_stage order by g.sort_order
    loop
      select array_agg(t.id order by t.seed)
      into v_group_teams
      from public.teams t
      where t.group_id = v_group;

      foreach v_pair slice 1 in array v_pairs loop
        insert into public.matches (
          tournament_id, stage_id, group_id, round, round_label, position,
          best_of, team1_id, team2_id
        ) values (
          v_tid, v_stage, v_group, v_pair[1], 'Тур ' || v_pair[1], v_pair[2],
          2, v_group_teams[v_pair[3]], v_group_teams[v_pair[4]]
        );
      end loop;
    end loop;
  end if;

  -- Разовая правка: первая версия файла проставляла матчам время-заглушку.
  -- Снимаем ровно те три метки, ничего назначенного вручную не задевая.
  update public.matches set scheduled_at = null
  where stage_id = v_stage
    and scheduled_at in (
      '2026-08-08 18:00:00+03'::timestamptz,
      '2026-08-08 19:30:00+03'::timestamptz,
      '2026-08-08 21:00:00+03'::timestamptz
    );

  -- ─── стыковые матчи ───────────────────────────────────────────────────────
  --
  -- Крест-накрест, чтобы третье место одной группы играло с четвёртым другой.

  if exists (select 1 from public.matches m where m.stage_id = v_playin) then
    raise notice 'Стыковые матчи уже созданы — не трогаем.';
  else
    insert into public.matches (
      tournament_id, stage_id, round, round_label, bracket, position, best_of,
      team1_source, team2_source
    ) values
      (v_tid, v_playin, 1, 'Стыковой матч', 'upper', 1, 3,
       '3 место, Группа A', '4 место, Группа B'),
      (v_tid, v_playin, 1, 'Стыковой матч', 'upper', 2, 3,
       '3 место, Группа B', '4 место, Группа A');
  end if;

  select id into v_playin1
  from public.matches m where m.stage_id = v_playin and m.round = 1 and m.position = 1;
  select id into v_playin2
  from public.matches m where m.stage_id = v_playin and m.round = 1 and m.position = 2;

  -- ─── сетка плей-офф ───────────────────────────────────────────────────────
  --
  -- Раунды продолжают нумерацию стыковых, потому что сетка на сайте рисуется
  -- по номеру раунда — так четыре колонки встают слева направо в одну линию.

  if exists (select 1 from public.matches m where m.stage_id = v_playoff) then
    raise notice 'Сетка плей-офф уже создана — не трогаем.';
  else
    insert into public.matches (
      tournament_id, stage_id, round, round_label, bracket, position, best_of,
      team1_source, team2_source
    ) values
      (v_tid, v_playoff, 2, 'Четвертьфинал', 'upper', 1, 3,
       '2 место, Группа B', 'Победитель: стыковой матч 1'),
      (v_tid, v_playoff, 2, 'Четвертьфинал', 'upper', 2, 3,
       '2 место, Группа A', 'Победитель: стыковой матч 2'),
      (v_tid, v_playoff, 3, 'Полуфинал', 'upper', 1, 3,
       '1 место, Группа A', 'Победитель: четвертьфинал 1'),
      (v_tid, v_playoff, 3, 'Полуфинал', 'upper', 2, 3,
       '1 место, Группа B', 'Победитель: четвертьфинал 2'),
      (v_tid, v_playoff, 4, 'Финал', 'final', 1, 3,
       'Победитель: полуфинал 1', 'Победитель: полуфинал 2'),
      (v_tid, v_playoff, 4, 'Матч за 3 место', 'final', 2, 3,
       'Проигравший: полуфинал 1', 'Проигравший: полуфинал 2');
  end if;

  select id into v_qf1   from public.matches m where m.stage_id = v_playoff and m.round = 2 and m.position = 1;
  select id into v_qf2   from public.matches m where m.stage_id = v_playoff and m.round = 2 and m.position = 2;
  select id into v_sf1   from public.matches m where m.stage_id = v_playoff and m.round = 3 and m.position = 1;
  select id into v_sf2   from public.matches m where m.stage_id = v_playoff and m.round = 3 and m.position = 2;
  select id into v_final from public.matches m where m.stage_id = v_playoff and m.round = 4 and m.position = 1;
  select id into v_third from public.matches m where m.stage_id = v_playoff and m.round = 4 and m.position = 2;

  -- Связи ставим всегда: они дешёвые, а без них триггер advance_bracket никого
  -- не продвинет. Победитель — вторым слотом, чтобы сеяная команда была сверху.
  update public.matches set winner_to_match_id = v_qf1, winner_to_slot = 2 where id = v_playin1;
  update public.matches set winner_to_match_id = v_qf2, winner_to_slot = 2 where id = v_playin2;
  update public.matches set winner_to_match_id = v_sf1, winner_to_slot = 2 where id = v_qf1;
  update public.matches set winner_to_match_id = v_sf2, winner_to_slot = 2 where id = v_qf2;

  update public.matches set
    winner_to_match_id = v_final, winner_to_slot = 1,
    loser_to_match_id = v_third, loser_to_slot = 1
  where id = v_sf1;

  update public.matches set
    winner_to_match_id = v_final, winner_to_slot = 2,
    loser_to_match_id = v_third, loser_to_slot = 2
  where id = v_sf2;

  raise notice 'G4Z CUP 11: команд %, матчей %',
    (select count(*) from public.teams where tournament_id = v_tid),
    (select count(*) from public.matches where tournament_id = v_tid);
end;
$$;
