-- Release 2 prerequisite: roster positions must never identify a person.
-- Versioning also prevents an old browser tab from overwriting a newer roster.
alter table public.teams add column roster_version bigint not null default 0;

create function public.bump_roster_version() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    update public.teams set roster_version = roster_version + 1 where id = old.team_id;
  elsif tg_op = 'UPDATE' and old.team_id <> new.team_id then
    -- Use the same lock order when moving a player between teams.
    perform id from public.teams where id in (old.team_id, new.team_id) order by id for update;
    update public.teams set roster_version = roster_version + 1 where id in (old.team_id, new.team_id);
  else
    update public.teams set roster_version = roster_version + 1 where id = new.team_id;
  end if;
  return null;
end;
$$;

revoke all on function public.bump_roster_version() from public, anon, authenticated;
create trigger players_roster_version after insert or update or delete on public.players
  for each row execute function public.bump_roster_version();

create function public.save_roster(
  p_team_id bigint, p_expected_version bigint, p_players jsonb, p_ip text default null
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  current_version bigint;
  row_data record;
begin
  select roster_version into current_version from public.teams where id = p_team_id for update;
  if not found then
    raise exception 'Команда не найдена' using errcode = 'P0002';
  end if;
  if p_expected_version is distinct from current_version then
    raise exception 'Состав уже изменён. Обновите страницу перед сохранением.' using errcode = '40001';
  end if;
  if p_players is null or jsonb_typeof(p_players) <> 'array' then
    raise exception 'Некорректный состав' using errcode = '22023';
  end if;
  if jsonb_array_length(p_players) > 64 then
    raise exception 'Слишком много игроков' using errcode = '22023';
  end if;
  -- Cast and validate the entire payload before changing any rows.
  if exists (
    select 1 from jsonb_to_recordset(p_players) as x(
      id bigint, nickname text, mmr integer, is_captain boolean, is_standin boolean, sort_order integer
    ) where (id is not null and id <= 0) or nickname is null or btrim(nickname) = ''
      or length(nickname) > 80 or mmr < 0 or mmr > 20000
      or is_captain is null or is_standin is null or sort_order is null or sort_order < 1
  ) or (select count(*) from jsonb_to_recordset(p_players) as x(is_captain boolean) where is_captain) > 1
    or (select count(*) <> count(distinct id) from jsonb_to_recordset(p_players) as x(id bigint) where id is not null)
    or (select count(*) <> count(distinct sort_order) from jsonb_to_recordset(p_players) as x(sort_order integer)) then
    raise exception 'Некорректные игроки, позиции или капитан' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_players) as x(id bigint)
    where x.id is not null and not exists (
      select 1 from public.players p where p.id = x.id and p.team_id = p_team_id
    )
  ) then
    raise exception 'Игрок не принадлежит этой команде. Обновите страницу.' using errcode = '23514';
  end if;

  -- Deleting a player uses the established ON DELETE SET NULL behavior for
  -- picks/awards. Reordering and editing preserve IDs and their references.
  delete from public.players p where p.team_id = p_team_id and not exists (
    select 1 from jsonb_to_recordset(p_players) as x(id bigint) where x.id = p.id
  );
  for row_data in select * from jsonb_to_recordset(p_players) as x(
    id bigint, nickname text, real_name text, role text, mmr integer,
    is_captain boolean, is_standin boolean, sort_order integer
  ) loop
    if row_data.id is null then
      insert into public.players(team_id, nickname, real_name, role, mmr, is_captain, is_standin, sort_order)
      values (p_team_id, btrim(row_data.nickname), row_data.real_name, row_data.role, row_data.mmr,
        row_data.is_captain, row_data.is_standin, row_data.sort_order);
    else
      update public.players set nickname = btrim(row_data.nickname), real_name = row_data.real_name,
        role = row_data.role, mmr = row_data.mmr, is_captain = row_data.is_captain,
        is_standin = row_data.is_standin, sort_order = row_data.sort_order
      where id = row_data.id and team_id = p_team_id;
    end if;
  end loop;
  -- Empty-to-empty saves also consume the submitted version.
  update public.teams set roster_version = roster_version + 1 where id = p_team_id;
  insert into public.audit_log(action, entity, entity_id, summary, payload, ip)
  values ('roster.replace', 'team', p_team_id, 'Состав сохранён: ' || jsonb_array_length(p_players) || ' игроков',
    jsonb_build_object('previous_version', current_version, 'players', p_players), p_ip);
end;
$$;

revoke all on function public.save_roster(bigint, bigint, jsonb, text) from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.save_roster(bigint, bigint, jsonb, text) to service_role;
  end if;
end;
$$;
