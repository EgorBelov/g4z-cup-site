-- Lifecycle commands are validated atomically in the database. The app never
-- writes the derived score, status, winner or loser columns itself.
create function public.set_match_lifecycle(p_match_id bigint, p_status text)
returns void language plpgsql security invoker set search_path = public as $$
declare
  m public.matches;
begin
  if p_status is null or p_status not in ('scheduled', 'live', 'cancelled') then
    raise exception 'Недопустимое действие с матчем' using errcode = '22023';
  end if;

  select * into m from public.matches where id = p_match_id for update;
  if not found then
    raise exception 'Матч не найден' using errcode = 'P0002';
  end if;

  if m.status = 'finished' then
    raise exception 'Сначала отмените результат последней карты завершённого матча'
      using errcode = '23514';
  end if;
  if p_status = 'scheduled' and exists (
    select 1 from public.games where match_id = p_match_id
  ) then
    raise exception 'Сначала удалите карты матча, чтобы вернуть его в расписание'
      using errcode = '23514';
  end if;
  if p_status = 'live' and (m.team1_id is null or m.team2_id is null) then
    raise exception 'Для старта нужны обе команды'
      using errcode = '23514';
  end if;

  update public.matches set
    status = p_status::public.match_status,
    started_at = case
      when p_status = 'scheduled' then null
      when p_status = 'live' then coalesce(m.started_at, now())
      else m.started_at
    end,
    finished_at = null
  where id = p_match_id;

  -- The existing map/series rules remain authoritative for score and outcome.
  perform public.recalc_match(p_match_id);
end;
$$;

revoke all on function public.set_match_lifecycle(bigint, text)
  from public, anon, authenticated;

-- Supabase provides service_role; plain PostgreSQL test installations may not.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.set_match_lifecycle(bigint, text) to service_role;
  end if;
end;
$$;
