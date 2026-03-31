truncate table
  match_game_bans,
  match_game_picks,
  match_games,
  matches
restart identity cascade;


begin;

truncate table
  match_game_bans,
  match_game_picks,
  match_games,
  matches
restart identity cascade;

insert into matches (
  id,
  tournament_id,
  stage,
  group_id,
  round_name,
  match_order,
  team1_id,
  team2_id,
  score1,
  score2,
  winner_id,
  scheduled_at,
  status,
  stream_url,
  is_featured_live,
  bo,
  next_match_id,
  next_match_slot,
  notes
)
values
  -- Round 1 — 04.04.2026 14:00 (Team G4ZIKI не играет)
  (1, 1, 'group', 1, 'Round 1', 1, 1, 7, 0, 0, null, '2026-04-04 11:00:00+03', 'upcoming', null, false, 'bo1', null, null, 'Group stage'),
  (2, 1, 'group', 1, 'Round 1', 2, 2, 6, 0, 0, null, '2026-04-04 11:00:00+03', 'upcoming', null, false, 'bo1', null, null, 'Group stage'),
  (3, 1, 'group', 1, 'Round 1', 3, 4, 5, 0, 0, null, '2026-04-04 11:00:00+03', 'upcoming', null, false, 'bo1', null, null, 'Group stage'),

  -- Round 2 — 15:00
  (4, 1, 'group', 1, 'Round 2', 1, 1, 6, 0, 0, null, '2026-04-04 12:00:00+03', 'upcoming', null, false, 'bo1', null, null, 'Group stage'),
  (5, 1, 'group', 1, 'Round 2', 2, 7, 5, 0, 0, null, '2026-04-04 12:00:00+03', 'upcoming', null, false, 'bo1', null, null, 'Group stage'),
  (6, 1, 'group', 1, 'Round 2', 3, 2, 3, 0, 0, null, '2026-04-04 12:00:00+03', 'upcoming', null, false, 'bo1', null, null, 'Group stage'),

  -- Round 3 — 16:00
  (7, 1, 'group', 1, 'Round 3', 1, 1, 5, 0, 0, null, '2026-04-04 13:00:00+03', 'upcoming', null, false, 'bo1', null, null, 'Group stage'),
  (8, 1, 'group', 1, 'Round 3', 2, 6, 3, 0, 0, null, '2026-04-04 13:00:00+03', 'upcoming', null, false, 'bo1', null, null, 'Group stage'),
  (9, 1, 'group', 1, 'Round 3', 3, 2, 4, 0, 0, null, '2026-04-04 13:00:00+03', 'upcoming', null, false, 'bo1', null, null, 'Group stage'),

  -- Round 4 — 17:00
  (10, 1, 'group', 1, 'Round 4', 1, 1, 3, 0, 0, null, '2026-04-04 14:00:00+03', 'upcoming', null, false, 'bo1', null, null, 'Group stage'),
  (11, 1, 'group', 1, 'Round 4', 2, 6, 4, 0, 0, null, '2026-04-04 14:00:00+03', 'upcoming', null, false, 'bo1', null, null, 'Group stage'),
  (12, 1, 'group', 1, 'Round 4', 3, 7, 2, 0, 0, null, '2026-04-04 14:00:00+03', 'upcoming', null, false, 'bo1', null, null, 'Group stage'),

  -- Round 5 — 18:00 (Bloody valentine отдыхает)
  (13, 1, 'group', 1, 'Round 5', 1, 3, 4, 0, 0, null, '2026-04-04 15:00:00+03', 'upcoming', null, false, 'bo1', null, null, 'Group stage'),
  (14, 1, 'group', 1, 'Round 5', 2, 5, 2, 0, 0, null, '2026-04-04 15:00:00+03', 'upcoming', null, false, 'bo1', null, null, 'Group stage'),
  (15, 1, 'group', 1, 'Round 5', 3, 6, 7, 0, 0, null, '2026-04-04 15:00:00+03', 'upcoming', null, false, 'bo1', null, null, 'Group stage'),

  -- Round 6 — 19:00 (ПИЗДАТЫЕ ПЕРМЬ отдыхает)
  (16, 1, 'group', 1, 'Round 6', 1, 1, 4, 0, 0, null, '2026-04-04 16:00:00+03', 'upcoming', null, false, 'bo1', null, null, 'Group stage'),
  (17, 1, 'group', 1, 'Round 6', 2, 3, 7, 0, 0, null, '2026-04-04 16:00:00+03', 'upcoming', null, false, 'bo1', null, null, 'Group stage'),
  (18, 1, 'group', 1, 'Round 6', 3, 5, 6, 0, 0, null, '2026-04-04 16:00:00+03', 'upcoming', null, false, 'bo1', null, null, 'Group stage'),

  -- Round 7 — 20:00 (Rehub отдыхает)
  (19, 1, 'group', 1, 'Round 7', 1, 1, 2, 0, 0, null, '2026-04-04 19:00:00+03', 'upcoming', null, false, 'bo1', null, null, 'Group stage'),
  (20, 1, 'group', 1, 'Round 7', 2, 4, 7, 0, 0, null, '2026-04-04 19:00:00+03', 'upcoming', null, false, 'bo1', null, null, 'Group stage'),
  (21, 1, 'group', 1, 'Round 7', 3, 3, 5, 0, 0, null, '2026-04-04 19:00:00+03', 'upcoming', null, false, 'bo1', null, null, 'Group stage');

commit;