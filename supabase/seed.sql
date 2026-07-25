-- ============================================================================
-- Local development seed. Applied automatically by `supabase db reset`.
--
-- Creates one in-progress tournament so every public page has content without
-- touching production data. The real archive lives in
-- supabase/data/g4z-cup-10.sql.
-- ============================================================================

do $$
declare
  t_id        bigint;
  group_stage bigint;
  playoff     bigint;
  grp         bigint;
  team_ids    bigint[] := '{}';
  team_names  text[] := array[
    'Team REHUB', 'Team BLOODY VALENTINE', 'Team PUBLIC', 'Team G4ZIKI',
    'Team ALENDVIC', 'Team НЕДРЫ ЧИЛИ', 'Team ПИЗДАТЫЕ ПЕРМЬ', 'Team NOOBS'
  ];
  team_slugs  text[] := array[
    'rehub', 'bloody-valentine', 'public', 'g4ziki',
    'alendvic', 'nedry-chili', 'pizdatye-perm', 'noobs'
  ];
  i           integer;
  j           integer;
  new_team    bigint;
  match_id    bigint;
  round_no    integer := 0;
  finished_budget integer := 14;
  sf1 bigint; sf2 bigint; grand_final bigint;
  base_time   timestamptz := date_trunc('hour', now()) - interval '6 hours';
begin
  insert into public.tournaments (
    slug, name, edition, status, is_current, starts_at, ends_at,
    format_summary, description, prize_pool, stream_url, telegram_url
  ) values (
    'g4z-cup-11', 'G4Z CUP 11', 11, 'live', true,
    base_time, base_time + interval '2 days',
    'Круговой групповой этап, плей-офф bo3',
    'Одиннадцатый сезон G4Z CUP по Dota 2.',
    'Слава и уважение',
    'https://www.twitch.tv/g4zcup_ru',
    'https://t.me/g4zagzes'
  )
  returning id into t_id;

  insert into public.stages (tournament_id, kind, name, sort_order, best_of, advance_count)
  values (t_id, 'round_robin', 'Групповой этап', 1, 1, 4)
  returning id into group_stage;

  insert into public.stages (tournament_id, kind, name, sort_order, best_of)
  values (t_id, 'single_elim', 'Плей-офф', 2, 3)
  returning id into playoff;

  insert into public.groups (tournament_id, stage_id, name, sort_order)
  values (t_id, group_stage, 'Группа A', 1)
  returning id into grp;

  for i in 1 .. array_length(team_names, 1) loop
    insert into public.teams (tournament_id, slug, name, tag, seed, group_id)
    values (t_id, team_slugs[i], team_names[i], upper(left(team_slugs[i], 4)), i, grp)
    returning id into new_team;

    team_ids := team_ids || new_team;

    for j in 1 .. 5 loop
      insert into public.players (team_id, nickname, role, is_captain, sort_order)
      values (
        new_team,
        team_slugs[i] || '_player' || j,
        (array['carry', 'mid', 'offlane', 'soft support', 'hard support'])[j],
        j = 1,
        j
      );
    end loop;
  end loop;

  -- Round robin: every pair once, spread one match per hour.
  for i in 1 .. array_length(team_ids, 1) - 1 loop
    for j in i + 1 .. array_length(team_ids, 1) loop
      round_no := round_no + 1;

      insert into public.matches (
        tournament_id, stage_id, group_id, round, round_label, position,
        best_of, team1_id, team2_id, scheduled_at, status
      ) values (
        t_id, group_stage, grp, i, 'Round ' || i, j - i,
        1, team_ids[i], team_ids[j],
        base_time + (round_no * interval '30 minutes'),
        'scheduled'
      )
      returning id into match_id;

      -- Give the standings something to show: close out the early matches.
      if finished_budget > 0 then
        insert into public.games (match_id, game_number, winner_id, duration_seconds)
        values (
          match_id, 1,
          case when (i + j) % 3 = 0 then team_ids[j] else team_ids[i] end,
          1800 + ((i * j * 137) % 1500)
        );
        finished_budget := finished_budget - 1;
      elsif finished_budget = 0 then
        -- One match in progress, so the live view has something to render.
        insert into public.games (match_id, game_number) values (match_id, 1);
        update public.matches
          set status = 'live', is_featured = true,
              stream_url = 'https://www.twitch.tv/g4zcup_ru'
          where id = match_id;
        finished_budget := -1;
      end if;
    end loop;
  end loop;

  -- Playoff skeleton wired by ids, not by round-name string matching.
  insert into public.matches (
    tournament_id, stage_id, round, round_label, bracket, position, best_of,
    team1_source, team2_source, scheduled_at
  ) values (
    t_id, playoff, 2, 'Финал', 'final', 1, 5,
    'Победитель полуфинала 1', 'Победитель полуфинала 2',
    base_time + interval '2 days'
  )
  returning id into grand_final;

  insert into public.matches (
    tournament_id, stage_id, round, round_label, bracket, position, best_of,
    team1_source, team2_source, scheduled_at, winner_to_match_id, winner_to_slot
  ) values (
    t_id, playoff, 1, 'Полуфинал 1', 'upper', 1, 3,
    '1 место группы', '4 место группы',
    base_time + interval '1 day', grand_final, 1
  )
  returning id into sf1;

  insert into public.matches (
    tournament_id, stage_id, round, round_label, bracket, position, best_of,
    team1_source, team2_source, scheduled_at, winner_to_match_id, winner_to_slot
  ) values (
    t_id, playoff, 1, 'Полуфинал 2', 'upper', 2, 3,
    '2 место группы', '3 место группы',
    base_time + interval '1 day' + interval '3 hours', grand_final, 2
  )
  returning id into sf2;

  update public.matches set team1_id = team_ids[1], team2_id = team_ids[4] where id = sf1;
  update public.matches set team1_id = team_ids[2], team2_id = team_ids[3] where id = sf2;
end;
$$;
