-- ============================================================================
-- Derived state lives in the database, so every writer (app, SQL console,
-- import script) produces consistent results.
--
--  * recalc_match  — score, status, winner and timestamps from the game rows
--  * advance_bracket — pushes winner/loser into the next match slot
-- ============================================================================

create function public.recalc_match(p_match_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare
  m           public.matches;
  wins1       integer;
  wins2       integer;
  game_count  integer;
  needed      integer;
  decided     boolean;
  new_winner  bigint;
  new_loser   bigint;
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found then
    return;
  end if;

  select
    count(*) filter (where g.winner_id is not null and g.winner_id = m.team1_id),
    count(*) filter (where g.winner_id is not null and g.winner_id = m.team2_id),
    count(*)
  into wins1, wins2, game_count
  from public.games g
  where g.match_id = p_match_id;

  -- bo1 -> 1, bo3 -> 2, bo5 -> 3
  needed := (m.best_of / 2) + 1;
  decided := wins1 >= needed or wins2 >= needed;

  if wins1 >= needed then
    new_winner := m.team1_id;
    new_loser := m.team2_id;
  elsif wins2 >= needed then
    new_winner := m.team2_id;
    new_loser := m.team1_id;
  else
    new_winner := null;
    new_loser := null;
  end if;

  update public.matches set
    score1 = wins1,
    score2 = wins2,
    winner_id = new_winner,
    loser_id = new_loser,
    status = case
      when m.status = 'cancelled' then 'cancelled'
      when decided then 'finished'::match_status
      when game_count > 0 then 'live'::match_status
      when m.status = 'live' then 'live'::match_status
      else 'scheduled'::match_status
    end,
    started_at = case
      when game_count > 0 or m.status = 'live' then coalesce(m.started_at, now())
      else m.started_at
    end,
    finished_at = case when decided then coalesce(m.finished_at, now()) else null end
  where id = p_match_id;
end;
$$;

create function public.games_recalc_match() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalc_match(old.match_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and new.match_id <> old.match_id then
    perform public.recalc_match(old.match_id);
  end if;

  perform public.recalc_match(new.match_id);
  return new;
end;
$$;

create trigger games_recalc after insert or update or delete on public.games
  for each row execute function public.games_recalc_match();

-- Changing the teams or the series length invalidates the derived score.
create function public.matches_recalc_self() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.recalc_match(new.id);
  return null;
end;
$$;

create trigger matches_recalc after update of team1_id, team2_id, best_of on public.matches
  for each row execute function public.matches_recalc_self();

-- ─── bracket progression ────────────────────────────────────────────────────

create function public.set_match_slot(
  p_match_id bigint,
  p_slot smallint,
  p_team_id bigint
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_match_id is null or p_slot is null then
    return;
  end if;

  if p_slot = 1 then
    update public.matches set team1_id = p_team_id where id = p_match_id;
  else
    update public.matches set team2_id = p_team_id where id = p_match_id;
  end if;
end;
$$;

-- Only clears the slot when it still holds the team we previously put there,
-- so a manual override by an admin is never silently reverted.
create function public.clear_match_slot(
  p_match_id bigint,
  p_slot smallint,
  p_team_id bigint
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_match_id is null or p_slot is null or p_team_id is null then
    return;
  end if;

  if p_slot = 1 then
    update public.matches set team1_id = null
      where id = p_match_id and team1_id = p_team_id;
  else
    update public.matches set team2_id = null
      where id = p_match_id and team2_id = p_team_id;
  end if;
end;
$$;

create function public.advance_bracket() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  is_finished boolean := new.status = 'finished' and new.winner_id is not null;
begin
  if is_finished then
    perform public.set_match_slot(new.winner_to_match_id, new.winner_to_slot, new.winner_id);
    perform public.set_match_slot(new.loser_to_match_id, new.loser_to_slot, new.loser_id);
  else
    -- Match was un-finished (score corrected, game deleted): roll the
    -- downstream slots back.
    perform public.clear_match_slot(new.winner_to_match_id, new.winner_to_slot, old.winner_id);
    perform public.clear_match_slot(new.loser_to_match_id, new.loser_to_slot, old.loser_id);
  end if;

  return null;
end;
$$;

-- Fires only when the outcome columns are touched, so writing team1_id/team2_id
-- (which is exactly what set_match_slot does) cannot recurse.
create trigger matches_advance after update of winner_id, loser_id, status on public.matches
  for each row execute function public.advance_bracket();
