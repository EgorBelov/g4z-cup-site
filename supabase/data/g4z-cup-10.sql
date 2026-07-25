-- ============================================================================
-- G4Z CUP 10 — archive base record.
--
-- Contains only what is verifiable from the v1 codebase: tournament metadata,
-- the seven participating teams, the final standings and the tournament MVP
-- (they were hardcoded in lib/constants/final-standings.ts).
--
-- Matches, games, drafts and rosters still live in the v1 Supabase project.
-- Copy them over with:
--
--   OLD_SUPABASE_URL=... OLD_SUPABASE_KEY=... \
--   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
--   node scripts/import-legacy.mjs
--
-- Safe to run more than once.
-- ============================================================================

do $$
declare
  t_id        bigint;
  group_stage bigint;
  grp         bigint;
  i           integer;
  team_names  text[] := array[
    'Team REHUB', 'Team BLOODY VALENTINE', 'Team PUBLIC', 'Team G4ZIKI',
    'Team ALENDVIC', 'Team НЕДРЫ ЧИЛИ', 'Team ПИЗДАТЫЕ ПЕРМЬ'
  ];
  team_slugs  text[] := array[
    'rehub', 'bloody-valentine', 'public', 'g4ziki',
    'alendvic', 'nedry-chili', 'pizdatye-perm'
  ];
  placement_notes text[] := array[
    'Чемпион', 'Финалист', 'Бронза', null, null, null, null
  ];
  place_order text[] := array[
    'rehub', 'bloody-valentine', 'public', 'g4ziki',
    'alendvic', 'nedry-chili', 'pizdatye-perm'
  ];
begin
  insert into public.tournaments (
    slug, name, edition, status, is_current, starts_at, ends_at,
    format_summary, description, stream_url, telegram_url
  ) values (
    'g4z-cup-10', 'G4Z CUP 10', 10, 'finished', false,
    '2026-04-04 11:00:00+03', '2026-04-05 21:00:00+03',
    'Одна группа из 7 команд, плей-офф: 1–2 места сразу в полуфинал, 3–6 — четвертьфинал',
    'Юбилейный, десятый турнир G4Z CUP по Dota 2.',
    'https://www.twitch.tv/g4zcup_ru',
    'https://t.me/g4zagzes'
  )
  on conflict (slug) do update set
    name = excluded.name,
    edition = excluded.edition,
    status = excluded.status,
    format_summary = excluded.format_summary,
    description = excluded.description
  returning id into t_id;

  select id into group_stage
  from public.stages where tournament_id = t_id and kind = 'round_robin' limit 1;

  if group_stage is null then
    insert into public.stages (tournament_id, kind, name, sort_order, best_of, advance_count)
    values (t_id, 'round_robin', 'Групповой этап', 1, 1, 6)
    returning id into group_stage;
  end if;

  if not exists (select 1 from public.stages where tournament_id = t_id and kind = 'single_elim') then
    insert into public.stages (tournament_id, kind, name, sort_order, best_of)
    values (t_id, 'single_elim', 'Плей-офф', 2, 3);
  end if;

  select id into grp
  from public.groups where stage_id = group_stage order by sort_order limit 1;

  if grp is null then
    insert into public.groups (tournament_id, stage_id, name, sort_order)
    values (t_id, group_stage, 'Группа A', 1)
    returning id into grp;
  end if;

  for i in 1 .. array_length(team_names, 1) loop
    insert into public.teams (tournament_id, slug, name, group_id)
    values (t_id, team_slugs[i], team_names[i], grp)
    on conflict (tournament_id, slug) do update set
      name = excluded.name,
      group_id = excluded.group_id;
  end loop;

  for i in 1 .. array_length(place_order, 1) loop
    insert into public.placements (tournament_id, place, team_id, team_label, note)
    values (
      t_id, i,
      (select id from public.teams where tournament_id = t_id and slug = place_order[i]),
      team_names[i],
      placement_notes[i]
    )
    on conflict (tournament_id, place) do update set
      team_id = excluded.team_id,
      team_label = excluded.team_label,
      note = excluded.note;
  end loop;

  if not exists (
    select 1 from public.awards where tournament_id = t_id and title = 'MVP турнира'
  ) then
    insert into public.awards (tournament_id, title, nickname, team_id, team_label, note, sort_order)
    values (
      t_id, 'MVP турнира', 'bodhiq-',
      (select id from public.teams where tournament_id = t_id and slug = 'rehub'),
      'Team REHUB', 'Самый ценный игрок турнира', 1
    );
  end if;
end;
$$;
