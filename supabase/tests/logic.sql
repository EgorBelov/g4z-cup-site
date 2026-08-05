-- ============================================================================
-- Assertions for the database-side logic. Run against a database that already
-- has the migrations and supabase/seed.sql applied:
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/logic.sql
--
-- Any failure raises an exception, so the script's exit code is the test result.
-- ============================================================================

\set ON_ERROR_STOP on

create or replace function assert_equals(
  expected anyelement,
  actual anyelement,
  label text
) returns void language plpgsql as $$
begin
  if expected is distinct from actual then
    raise exception 'FAIL %: expected %, got %', label, expected, actual;
  end if;
  raise notice 'ok — %', label;
end;
$$;

do $$
declare
  t_id      bigint;
  stage_id  bigint;
  a_id      bigint;
  b_id      bigint;
  c_id      bigint;
  semi      bigint;
  final     bigint;
  grp       bigint;
  rr_stage  bigint;
  group_match bigint;
  bo2_match bigint;
begin
  -- Isolated fixture, so the seed data is left alone.
  insert into tournaments (slug, name, status)
  values ('logic-test-cup', 'Logic test cup', 'upcoming')
  returning id into t_id;

  insert into stages (tournament_id, kind, name, sort_order, best_of)
  values (t_id, 'single_elim', 'Playoff', 1, 3)
  returning id into stage_id;

  insert into stages (tournament_id, kind, name, sort_order, best_of)
  values (t_id, 'round_robin', 'Group stage', 0, 1)
  returning id into rr_stage;

  insert into groups (tournament_id, stage_id, name, sort_order)
  values (t_id, rr_stage, 'G', 1)
  returning id into grp;

  insert into teams (tournament_id, slug, name, group_id)
  values (t_id, 'alpha', 'Alpha', grp) returning id into a_id;
  insert into teams (tournament_id, slug, name, group_id)
  values (t_id, 'bravo', 'Bravo', grp) returning id into b_id;
  insert into teams (tournament_id, slug, name, group_id)
  values (t_id, 'charlie', 'Charlie', grp) returning id into c_id;

  insert into matches (tournament_id, stage_id, round, position, best_of, bracket, round_label)
  values (t_id, stage_id, 2, 1, 3, 'final', 'Final')
  returning id into final;

  insert into matches (
    tournament_id, stage_id, round, position, best_of, bracket, round_label,
    team1_id, team2_id, winner_to_match_id, winner_to_slot,
    loser_to_match_id, loser_to_slot
  )
  values (
    t_id, stage_id, 1, 1, 3, 'upper', 'Semifinal',
    a_id, b_id, final, 1, null, null
  )
  returning id into semi;

  -- A fresh series starts empty.
  perform assert_equals('scheduled'::match_status,
    (select status from matches where id = semi), 'new match is scheduled');

  -- One map in a bo3 puts the match live but does not decide it.
  insert into games (match_id, game_number, winner_id) values (semi, 1, a_id);

  perform assert_equals(1, (select score1 from matches where id = semi),
    'first map counts towards score1');
  perform assert_equals('live'::match_status,
    (select status from matches where id = semi), 'a played map makes it live');
  perform assert_equals(null::bigint,
    (select winner_id from matches where id = semi), 'bo3 is not decided at 1-0');
  perform assert_equals(null::bigint,
    (select team1_id from matches where id = final),
    'nothing advances before the series ends');

  -- Second map decides the series and promotes the winner.
  insert into games (match_id, game_number, winner_id) values (semi, 2, a_id);

  perform assert_equals('finished'::match_status,
    (select status from matches where id = semi), 'bo3 ends at 2-0');
  perform assert_equals(a_id, (select winner_id from matches where id = semi),
    'winner is derived from map wins');
  perform assert_equals(b_id, (select loser_id from matches where id = semi),
    'loser is derived too');
  perform assert_equals(true,
    (select finished_at is not null from matches where id = semi),
    'finished_at is stamped');
  perform assert_equals(a_id, (select team1_id from matches where id = final),
    'winner advances into the linked slot');

  -- Correcting a mistake rolls the bracket back.
  delete from games where match_id = semi and game_number = 2;

  perform assert_equals('live'::match_status,
    (select status from matches where id = semi), 'removing a map reopens the series');
  perform assert_equals(null::bigint, (select team1_id from matches where id = final),
    'the downstream slot is cleared');
  perform assert_equals(null::timestamptz,
    (select finished_at from matches where id = semi), 'finished_at is cleared');

  -- A manual override downstream is not stomped on by a later rollback.
  insert into games (match_id, game_number, winner_id) values (semi, 2, a_id);
  update matches set team1_id = c_id where id = final;
  delete from games where match_id = semi and game_number = 2;

  perform assert_equals(c_id, (select team1_id from matches where id = final),
    'a manual slot override survives a rollback');

  -- Swapping the teams invalidates the derived score.
  update matches set team1_id = b_id, team2_id = a_id where id = semi;
  perform assert_equals(0, (select score1 from matches where id = semi),
    'changing teams recalculates the score');
  perform assert_equals(1, (select score2 from matches where id = semi),
    'the surviving map now counts for the other side');

  -- bo1 is decided by a single map.
  update matches set best_of = 1 where id = semi;
  perform assert_equals('finished'::match_status,
    (select status from matches where id = semi), 'bo1 ends after one map');

  -- Standings aggregate the group stage, not the bracket.
  perform assert_equals(0::bigint,
    (select wins from standings where team_id = a_id),
    'playoff results do not leak into the group table');

  insert into matches (
    tournament_id, stage_id, group_id, round, position, best_of, team1_id, team2_id
  )
  values (t_id, rr_stage, grp, 1, 1, 1, a_id, b_id)
  returning id into group_match;

  insert into games (match_id, game_number, winner_id) values (group_match, 1, a_id);

  perform assert_equals(1::bigint,
    (select wins from standings where team_id = a_id), 'standings count the win');
  perform assert_equals(1::bigint,
    (select losses from standings where team_id = b_id), 'and the loss');
  perform assert_equals(2, (select points from standings where team_id = a_id),
    'a win is worth two points');
  perform assert_equals(0::bigint,
    (select played from standings where team_id = c_id),
    'a team with no games still appears in the table');
  perform assert_equals(3::bigint,
    (select count(*) from standings where tournament_id = t_id),
    'every team in a group appears in the table');

  -- bo2: both maps are always played, so the series may end level.
  insert into matches (
    tournament_id, stage_id, group_id, round, position, best_of, team1_id, team2_id
  )
  values (t_id, rr_stage, grp, 2, 1, 2, a_id, c_id)
  returning id into bo2_match;

  insert into games (match_id, game_number, winner_id) values (bo2_match, 1, a_id);

  perform assert_equals('live'::match_status,
    (select status from matches where id = bo2_match), 'bo2 is not over at 1-0');
  perform assert_equals(null::bigint,
    (select winner_id from matches where id = bo2_match),
    'a bo2 lead is not a series win');

  insert into games (match_id, game_number, winner_id) values (bo2_match, 2, c_id);

  perform assert_equals('finished'::match_status,
    (select status from matches where id = bo2_match), 'bo2 ends after two maps');
  perform assert_equals(null::bigint,
    (select winner_id from matches where id = bo2_match), '1-1 has no winner');
  perform assert_equals(true,
    (select finished_at is not null from matches where id = bo2_match),
    'a drawn series is still stamped as finished');
  perform assert_equals(1::bigint,
    (select draws from standings where team_id = a_id), 'the draw is counted');
  perform assert_equals(2::bigint,
    (select played from standings where team_id = a_id),
    'a draw counts as a played series');
  perform assert_equals(3, (select points from standings where team_id = a_id),
    'a draw adds one point');
  perform assert_equals(1, (select points from standings where team_id = c_id),
    'both sides of a draw score');

  -- Taking both maps wins the series outright.
  update games set winner_id = a_id where match_id = bo2_match and game_number = 2;

  perform assert_equals(a_id, (select winner_id from matches where id = bo2_match),
    '2-0 wins a bo2');
  perform assert_equals(c_id, (select loser_id from matches where id = bo2_match),
    'and the other side loses it');
  perform assert_equals(0::bigint,
    (select draws from standings where team_id = a_id),
    'the draw is gone once the maps change');

  -- Only one tournament can be current.
  begin
    update tournaments set is_current = true where id = t_id;
    if (select count(*) from tournaments where is_current) > 1 then
      raise exception 'FAIL: more than one current tournament';
    end if;
    raise notice 'ok — a second current tournament is refused or replaces the first';
  exception when unique_violation then
    raise notice 'ok — a second current tournament is refused';
  end;

  delete from tournaments where id = t_id;
  raise notice 'all database logic assertions passed';
end;
$$;

drop function assert_equals(anyelement, anyelement, text);
