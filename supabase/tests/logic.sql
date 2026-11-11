-- ============================================================================
-- Assertions for the database-side logic. Run against a database that already
-- has the migrations and supabase/seed.sql applied:
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/logic.sql
--
-- Any failure raises an exception, so the script's exit code is the test result.
-- ============================================================================

\set ON_ERROR_STOP on

begin;
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
  lifecycle_match bigint;
  requested_status text;
begin
  -- Isolated fixture, so the seed data is left alone.
  insert into tournaments (slug, name, status)
  values ('logic-test-cup', 'Logic test cup', 'upcoming')
  returning id into t_id;

  insert into stages (tournament_id, kind, name, sort_order, best_of)
  values (t_id, 'single_elim', 'Playoff', 1, 3)
  returning id into stage_id;

  insert into stages (
    tournament_id, kind, name, sort_order, best_of,
    advance_count, playin_count, starts_on, ends_on
  )
  values (t_id, 'round_robin', 'Group stage', 0, 1, 2, 2, '2026-08-03', '2026-08-07')
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

  -- The stage window and the play-in band reach the table through `standings`,
  -- which is the only thing the group page reads.
  perform assert_equals(2, (select advance_count from standings where team_id = a_id),
    'standings carry the advance line');
  perform assert_equals(2, (select playin_count from standings where team_id = a_id),
    'standings carry the play-in band');

  begin
    update stages set starts_on = '2026-08-07', ends_on = '2026-08-03'
      where id = rr_stage;
    raise exception 'FAIL: a stage window ending before it starts was accepted';
  exception when check_violation then
    raise notice 'ok — a stage window cannot end before it starts';
  end;

  -- Lifecycle commands cannot override a series outcome or skip map validation.
  insert into matches (tournament_id, stage_id, round, position, best_of)
  values (t_id, stage_id, 3, 1, 3) returning id into lifecycle_match;

  begin
    perform set_match_lifecycle(lifecycle_match, 'live');
    raise exception 'FAIL: a match without opponents was started';
  exception when check_violation then
    raise notice 'ok — start requires both teams';
  end;

  update matches set team1_id = a_id, team2_id = b_id where id = lifecycle_match;
  perform set_match_lifecycle(lifecycle_match, 'live');
  perform assert_equals('live'::match_status,
    (select status from matches where id = lifecycle_match), 'explicit start is live');
  perform assert_equals(true,
    (select started_at is not null from matches where id = lifecycle_match),
    'explicit start has a timestamp');
  perform assert_equals(0,
    (select score1 + score2 from matches where id = lifecycle_match),
    'explicit start does not invent maps');

  perform set_match_lifecycle(lifecycle_match, 'scheduled');
  perform assert_equals('scheduled'::match_status,
    (select status from matches where id = lifecycle_match), 'unplayed start can be reset');
  perform assert_equals(null::timestamptz,
    (select started_at from matches where id = lifecycle_match), 'reset clears start time');

  insert into games (match_id, game_number, winner_id)
    values (lifecycle_match, 1, a_id);
  begin
    perform set_match_lifecycle(lifecycle_match, 'scheduled');
    raise exception 'FAIL: a played match was returned to the schedule';
  exception when check_violation then
    raise notice 'ok — maps must be removed before resetting';
  end;

  perform set_match_lifecycle(lifecycle_match, 'cancelled');
  perform assert_equals('cancelled'::match_status,
    (select status from matches where id = lifecycle_match), 'unfinished match can be cancelled');
  perform assert_equals(1,
    (select score1 from matches where id = lifecycle_match), 'cancellation keeps the map score');
  perform set_match_lifecycle(lifecycle_match, 'live');
  perform assert_equals('live'::match_status,
    (select status from matches where id = lifecycle_match), 'cancelled match can resume');

  insert into games (match_id, game_number, winner_id)
    values (lifecycle_match, 2, a_id);
  foreach requested_status in array array['scheduled', 'live', 'cancelled'] loop
    begin
      perform set_match_lifecycle(lifecycle_match, requested_status);
      raise exception 'FAIL: finished series was overridden with %', requested_status;
    exception when check_violation then
      raise notice 'ok — finished series rejects % override', requested_status;
    end;
  end loop;
  perform assert_equals(a_id,
    (select winner_id from matches where id = lifecycle_match), 'lifecycle keeps derived winner');

  begin
    perform set_match_lifecycle(lifecycle_match, 'finished');
    raise exception 'FAIL: lifecycle accepted a manual finish';
  exception when invalid_parameter_value then
    raise notice 'ok — finishing requires map results';
  end;

  perform assert_equals(false,
    has_function_privilege('anon', 'public.set_match_lifecycle(bigint,text)', 'EXECUTE'),
    'anonymous users cannot change lifecycle');
  perform assert_equals(false,
    has_function_privilege('authenticated', 'public.set_match_lifecycle(bigint,text)', 'EXECUTE'),
    'player sessions cannot change lifecycle');
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    perform assert_equals(true,
      has_function_privilege('service_role', 'public.set_match_lifecycle(bigint,text)', 'EXECUTE'),
      'service role can execute lifecycle commands');
  end if;

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

commit;

-- Stable roster IDs, optimistic concurrency and all-or-nothing writes.
begin;
create function public.test_reject_roster_player() returns trigger language plpgsql as $$
begin
  if new.nickname = 'reject-this-player' then
    raise exception 'synthetic write failure' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger test_roster_failure before insert or update on public.players
  for each row execute function public.test_reject_roster_player();

do $$
declare
  tid bigint; teamid bigint; otherteam bigint; firstid bigint; secondid bigint; foreignid bigint;
  stageid bigint; matchid bigint; gameid bigint; pickid bigint; awardid bigint;
  version bigint; new_version bigint; payload jsonb; invalid jsonb; old_count bigint;
begin
  insert into tournaments(slug, name, status) values ('roster-identity-test', 'Roster', 'upcoming') returning id into tid;
  insert into teams(tournament_id, slug, name) values (tid, 'one', 'One') returning id into teamid;
  insert into teams(tournament_id, slug, name) values (tid, 'two', 'Two') returning id into otherteam;
  insert into players(team_id, nickname, mmr, steam_url, dotabuff_url, real_name)
    values (teamid, 'First', 5000, 'https://steamcommunity.com/id/private', 'https://www.dotabuff.com/players/123', 'Private Name') returning id into firstid;
  insert into players(team_id, nickname, mmr) values (teamid, 'Second', null) returning id into secondid;
  insert into players(team_id, nickname) values (otherteam, 'Other team') returning id into foreignid;
  insert into stages(tournament_id, kind, name) values(tid, 'round_robin', 'Stage') returning id into stageid;
  insert into matches(tournament_id, stage_id, team1_id, team2_id) values(tid, stageid, teamid, otherteam) returning id into matchid;
  insert into games(match_id, game_number) values(matchid, 1) returning id into gameid;
  insert into game_picks(game_id, team_id, hero, player_id, order_no) values(gameid, teamid, 'Puck', firstid, 1) returning id into pickid;
  insert into awards(tournament_id, title, player_id) values(tid, 'MVP', secondid) returning id into awardid;
  select roster_version into version from teams where id = teamid;
  payload := jsonb_build_array(
    jsonb_build_object('id', secondid, 'nickname', 'Second renamed', 'mmr', null, 'is_captain', true, 'is_standin', false, 'sort_order', 1),
    jsonb_build_object('id', firstid, 'nickname', 'First renamed', 'mmr', 5100, 'is_captain', false, 'is_standin', true, 'sort_order', 2)
  );
  perform save_roster(teamid, version, payload);
  perform assert_equals(firstid, (select player_id from game_picks where id = pickid), 'reordering preserves draft identity');
  perform assert_equals(secondid, (select player_id from awards where id = awardid), 'reordering preserves award identity');
  perform assert_equals(2, (select sort_order from players where id = firstid), 'display position changes independently');
  perform assert_equals(true, (select is_standin from players where id = firstid), 'substitute flag is editable');
  perform assert_equals(null::integer, (select mmr from players where id = secondid), 'missing MMR remains optional');
  perform assert_equals('https://steamcommunity.com/id/private'::text, (select steam_url from players where id = firstid), 'editing roster preserves private links');
  perform assert_equals(1::bigint, (select count(*) from audit_log where entity_id = teamid and action = 'roster.replace'), 'roster audit is written once');
  begin
    perform save_roster(teamid, version, payload);
    raise exception 'FAIL stale roster overwrote current version';
  exception when serialization_failure then raise notice 'ok — stale roster refused'; end;
  select roster_version into new_version from teams where id = teamid;
  invalid := jsonb_set(payload, '{0,id}', to_jsonb(foreignid));
  begin
    perform save_roster(teamid, new_version, invalid);
    raise exception 'FAIL player from another team accepted';
  exception when check_violation then raise notice 'ok — foreign player refused'; end;
  invalid := jsonb_set(payload, '{0,id}', to_jsonb(firstid));
  begin
    perform save_roster(teamid, new_version, invalid);
    raise exception 'FAIL duplicate player accepted';
  exception when invalid_parameter_value then raise notice 'ok — duplicate identity refused'; end;
  invalid := jsonb_set(payload, '{1,sort_order}', '1');
  begin
    perform save_roster(teamid, new_version, invalid);
    raise exception 'FAIL duplicate position accepted';
  exception when invalid_parameter_value then raise notice 'ok — duplicate position refused'; end;
  invalid := jsonb_set(payload, '{1,is_captain}', 'true');
  begin
    perform save_roster(teamid, new_version, invalid);
    raise exception 'FAIL two captains accepted';
  exception when invalid_parameter_value then raise notice 'ok — duplicate captain refused'; end;
  invalid := jsonb_set(payload, '{1,mmr}', '-1');
  begin
    perform save_roster(teamid, new_version, invalid);
    raise exception 'FAIL invalid MMR accepted';
  exception when invalid_parameter_value then raise notice 'ok — invalid rating refused'; end;
  begin
    perform save_roster(teamid, new_version, 'null'::jsonb);
    raise exception 'FAIL malformed roster accepted';
  exception when invalid_parameter_value then raise notice 'ok — malformed roster refused'; end;
  -- Deletion happens before updates. A failing update must undo that deletion,
  -- its version change and the ON DELETE SET NULL on draft references.
  invalid := jsonb_build_array(jsonb_set(payload->0, '{nickname}', '"reject-this-player"'));
  begin
    perform save_roster(teamid, new_version, invalid);
    raise exception 'FAIL synthetic failure was ignored';
  exception when check_violation then raise notice 'ok — entire write rolled back'; end;
  perform assert_equals(2::bigint, (select count(*) from players where team_id = teamid), 'failed write keeps removed players');
  perform assert_equals(firstid, (select player_id from game_picks where id = pickid), 'failed deletion keeps draft references');
  perform assert_equals(new_version, (select roster_version from teams where id = teamid), 'failed write keeps version');
  perform assert_equals(1::bigint, (select count(*) from audit_log where entity_id = teamid and action = 'roster.replace'), 'failed write creates no audit entry');
  -- A new row has no ID; removing a row never assigns its ID to a replacement.
  payload := jsonb_build_array(payload->1, jsonb_build_object('id', null, 'nickname', 'New player', 'mmr', null,
    'is_captain', false, 'is_standin', false, 'sort_order', 3));
  perform save_roster(teamid, new_version, payload);
  perform assert_equals(null::bigint, (select player_id from awards where id = awardid), 'removed player follows existing archive FK behavior');
  perform assert_equals(firstid, (select player_id from game_picks where id = pickid), 'remaining player keeps draft');
  perform assert_equals(true, (select id <> firstid and id <> secondid from players where team_id = teamid and nickname = 'New player'), 'new player gets a new identity');

  perform assert_equals(false, has_function_privilege('anon', 'public.save_roster(bigint,bigint,jsonb,text)', 'EXECUTE'), 'guest cannot save roster');
  perform assert_equals(false, has_function_privilege('authenticated', 'public.save_roster(bigint,bigint,jsonb,text)', 'EXECUTE'), 'player session cannot save administrative roster');
  perform assert_equals(true, has_function_privilege('service_role', 'public.save_roster(bigint,bigint,jsonb,text)', 'EXECUTE'), 'service role can save roster');
end;
$$;

-- Positive public read and negative private reads on the same nonempty fixture.
set local role anon;
do $$
begin
  perform assert_equals(1::bigint, (select count(*) from players where nickname = 'First renamed'), 'guest sees published nickname');
  begin
    perform steam_url from players limit 1;
    raise exception 'FAIL guest read Steam';
  exception when insufficient_privilege then raise notice 'ok — guest cannot read Steam'; end;
  begin
    perform dotabuff_url from players limit 1;
    raise exception 'FAIL guest read Dotabuff';
  exception when insufficient_privilege then raise notice 'ok — guest cannot read Dotabuff'; end;
  begin
    perform real_name from players limit 1;
    raise exception 'FAIL guest read real name';
  exception when insufficient_privilege then raise notice 'ok — guest cannot read real name'; end;
  begin
    perform save_roster(null, 0, '[]');
    raise exception 'FAIL guest called save_roster';
  exception when insufficient_privilege then raise notice 'ok — guest RPC denied'; end;
end;
$$;
reset role;
set local role authenticated;
do $$
begin
  perform assert_equals(1::bigint, (select count(*) from players where nickname = 'First renamed'), 'other player sees published nickname');
  begin
    perform steam_url, dotabuff_url, real_name from players limit 1;
    raise exception 'FAIL player read private columns';
  exception when insufficient_privilege then raise notice 'ok — other player cannot read private columns'; end;
  begin
    perform save_roster(null, 0, '[]');
    raise exception 'FAIL player called save_roster';
  exception when insufficient_privilege then raise notice 'ok — player RPC denied'; end;
end;
$$;
reset role;
set local role service_role;
do $$
declare teamid bigint; version bigint; payload jsonb;
begin
  perform assert_equals(1::bigint, (select count(*) from players where steam_url = 'https://steamcommunity.com/id/private'), 'organizer retains private access');
  select t.id, t.roster_version into teamid, version from teams t join tournaments r on r.id = t.tournament_id where r.slug = 'roster-identity-test' and t.slug = 'two';
  payload := jsonb_build_array(jsonb_build_object('id', null, 'nickname', 'Service role write', 'is_captain', false, 'is_standin', false, 'sort_order', 1));
  perform save_roster(teamid, version, payload);
  perform assert_equals(1::bigint, (select count(*) from players where team_id = teamid), 'service role executes transactional save');
end;
$$;
reset role;
rollback;

drop function assert_equals(anyelement, anyelement, text);
