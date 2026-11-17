-- Passwords remain in Supabase Auth. The initial nickname is a stable login,
-- independent of the editable public nickname and the unverified TG contact.
alter table public.player_profiles alter column telegram_id drop not null;
alter table public.player_profiles add column login_nickname text unique
  check (login_nickname is null or length(trim(login_nickname)) between 2 and 80);
alter table public.player_profiles add constraint player_login_identity
  check (telegram_id is not null or login_nickname is not null);

create function public.register_password_player(p_user uuid,p_login text,p_profile jsonb,p_ip text default null)
returns uuid language plpgsql security invoker set search_path='' as $$
begin
  if p_login is null or p_login <> lower(trim(p_login)) then
    raise exception 'Invalid login nickname';
  end if;
  -- Do not let a repeated signup replace or attach credentials to a profile.
  insert into public.player_profiles(id,login_nickname,nickname,telegram_username,telegram_contact_verified,steam_url,faceit_url,dotabuff_url)
    values(p_user,p_login,p_profile->>'nickname',p_profile->>'telegram_username',false,
      p_profile->>'steam_url',p_profile->>'faceit_url',p_profile->>'dotabuff_url');
  if p_profile->>'dota_mmr' is not null then
    insert into public.player_ratings values(p_user,'dota2',(p_profile->>'dota_mmr')::integer);
  end if;
  if p_profile->>'cs_elo' is not null then
    insert into public.player_ratings values(p_user,'cs2',(p_profile->>'cs_elo')::integer);
  end if;
  insert into public.audit_log(action,entity,actor_kind,actor_id,ip,summary)
    values('player.register','profile','player',p_user,p_ip,'Создан профиль игрока по паролю');
  return p_user;
end $$;
revoke all on function public.register_password_player(uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.register_password_player(uuid,text,jsonb,text) to service_role;
