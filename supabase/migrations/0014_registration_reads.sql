-- Views retain their original columns when a source table grows. Append the
-- new tournament settings without changing the existing view column order.
create or replace view public.tournament_summaries with (security_invoker=true) as
select t.id,t.slug,t.name,t.edition,t.game,t.status,t.is_current,t.starts_at,t.ends_at,t.time_zone,
  t.format_summary,t.description,t.prize_pool,t.stream_url,t.telegram_url,t.logo_url,t.created_at,t.updated_at,
  (select count(*) from public.teams tm where tm.tournament_id=t.id) as team_count,
  (select count(*) from public.matches m where m.tournament_id=t.id) as match_count,
  (select coalesce(ch.name,p.team_label) from public.placements p left join public.teams ch on ch.id=p.team_id
    where p.tournament_id=t.id and p.place=1 limit 1) as champion_name,
  t.discipline,t.registration_open,t.roster_size,t.max_substitutes
from public.tournaments t;

create function public.search_registration_players(p_actor uuid,p_admin boolean,p_team bigint,p_query text)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
  if not coalesce(p_admin,false) and not exists(select 1 from public.community_teams where id=p_team and not archived
    and (main_captain=p_actor or second_captain=p_actor)) then raise exception using errcode='42501',message='Поиск доступен капитанам'; end if;
  if length(trim(p_query))<2 or length(p_query)>80 then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(to_jsonb(s)) from (select p.id,p.code,p.nickname,
    (select value from public.player_ratings where profile_id=p.id and discipline='dota2') as dota_mmr,
    (select value from public.player_ratings where profile_id=p.id and discipline='cs2') as cs_elo
    from public.player_profiles p where position(lower(p_query) in lower(p.nickname))>0 or 'P'||p.code::text=upper(p_query)
    order by lower(p.nickname),p.code limit 12) s),'[]'::jsonb);
end $$;
revoke all on function public.search_registration_players(uuid,boolean,bigint,text) from public,anon,authenticated;
grant execute on function public.search_registration_players(uuid,boolean,bigint,text) to service_role;

-- Keep cross-tournament membership impossible even for a mistaken service write.
create function public.check_member_tournament() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if not exists(select 1 from public.registration_teams where id=new.registration_team_id and tournament_id=new.tournament_id) then
    raise exception using errcode='23514',message='Состав относится к другому турниру';
  end if;
  return new;
end $$;
create trigger member_tournament before insert or update on public.team_members
  for each row execute function public.check_member_tournament();
revoke all on function public.check_member_tournament() from public,anon,authenticated;
grant execute on function public.check_member_tournament() to service_role;
