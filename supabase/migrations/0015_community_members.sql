-- Persistent community membership is independent of tournament rosters.
create table public.community_members (
  community_team_id bigint not null references public.community_teams(id),
  profile_id uuid not null references public.player_profiles(id),
  joined_at timestamptz not null default now(),
  primary key (community_team_id, profile_id)
);
create index community_members_profile on public.community_members(profile_id);
create table public.community_member_invites (
  id bigint generated always as identity primary key,
  community_team_id bigint not null references public.community_teams(id),
  recipient_id uuid not null references public.player_profiles(id),
  status text not null default 'active' check (status in ('active','accepted','rejected','revoked')),
  expires_at timestamptz not null default now() + interval '7 days'
);
create unique index community_member_invite_active on public.community_member_invites(community_team_id,recipient_id) where status='active';
create index community_member_invites_recipient on public.community_member_invites(recipient_id) where status='active';
alter table public.community_members enable row level security;
alter table public.community_member_invites enable row level security;
revoke all on public.community_members,public.community_member_invites from public,anon,authenticated;
grant all on public.community_members,public.community_member_invites to service_role;
grant usage,select on sequence public.community_member_invites_id_seq to service_role;

create function public.community_member_command(p_actor uuid,p_admin boolean,p_action text,p_input jsonb,p_ip text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.community_teams; inv public.community_member_invites; target uuid; captain boolean;
begin
  perform pg_advisory_xact_lock(194713,1);
  if p_admin is distinct from false or not exists(select 1 from public.player_profiles where id=p_actor) then
    raise exception using errcode='42501',message='Требуется аккаунт игрока';
  end if;
  if p_action in ('community_accept','community_decline','community_revoke') then
    select * into inv from public.community_member_invites where id=(p_input->>'invite_id')::bigint for update;
    if not found then raise exception 'Приглашение не найдено'; end if;
    select * into c from public.community_teams where id=inv.community_team_id for update;
  else
    select * into c from public.community_teams where id=(p_input->>'team_id')::bigint for update;
  end if;
  if c.id is null then raise exception 'Команда не найдена'; end if;
  captain:=coalesce(c.main_captain=p_actor or c.second_captain=p_actor,false);
  case p_action
  when 'community_invite' then
    if not captain or c.archived then raise exception 'Приглашать могут только капитаны активной команды'; end if;
    target:=(p_input->>'recipient_id')::uuid;
    if target is null or not exists(select 1 from public.player_profiles where id=target) then raise exception 'Игрок не найден'; end if;
    if target=c.main_captain or target=c.second_captain or exists(select 1 from public.community_members where community_team_id=c.id and profile_id=target) then
      raise exception 'Игрок уже в команде';
    end if;
    update public.community_member_invites set status='revoked' where community_team_id=c.id and recipient_id=target and status='active';
    insert into public.community_member_invites(community_team_id,recipient_id) values(c.id,target);
  when 'community_accept','community_decline' then
    if inv.recipient_id is distinct from p_actor then raise exception 'Приглашение другому игроку'; end if;
    if inv.status<>'active' or inv.expires_at<=now() or c.archived then raise exception 'Приглашение недоступно'; end if;
    target:=p_actor;
    if p_action='community_accept' then
      insert into public.community_members(community_team_id,profile_id) values(c.id,p_actor) on conflict do nothing;
    end if;
    update public.community_member_invites set status=case when p_action='community_accept' then 'accepted' else 'rejected' end where id=inv.id;
  when 'community_revoke' then
    if not captain then raise exception 'Нет прав на отзыв'; end if;
    update public.community_member_invites set status='revoked' where id=inv.id and status='active';
    target:=inv.recipient_id;
  when 'community_remove','community_leave' then
    if p_action='community_remove' and (not captain or c.archived) then raise exception 'Нет прав на состав команды'; end if;
    target:=case when p_action='community_leave' then p_actor else (p_input->>'profile_id')::uuid end;
    if target=c.main_captain or target=c.second_captain then raise exception 'Сначала измените роль капитана'; end if;
    delete from public.community_members where community_team_id=c.id and profile_id=target;
    if not found then raise exception 'Игрок не найден в команде'; end if;
  else raise exception 'Неизвестное действие';
  end case;
  insert into public.registration_events(community_team_id,profile_id,action,actor_kind,actor_id) values(c.id,target,p_action,'player',p_actor);
  insert into public.audit_log(action,entity,entity_id,actor_kind,actor_id,ip,summary) values('registration.'||p_action,'community_team',c.id,'player',p_actor,p_ip,p_action);
  return jsonb_build_object('team_id',c.id,'slug',c.slug);
end $$;
revoke all on function public.community_member_command(uuid,boolean,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.community_member_command(uuid,boolean,text,jsonb,text) to service_role;

-- Archiving revokes outstanding invitations even if the team is restored later.
create function public.revoke_community_member_invites() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.archived and not old.archived then
    update public.community_member_invites set status='revoked' where community_team_id=new.id and status='active';
  end if;
  return new;
end $$;
create trigger community_member_invites_archive after update of archived on public.community_teams
for each row execute function public.revoke_community_member_invites();
revoke all on function public.revoke_community_member_invites() from public,anon,authenticated;
grant execute on function public.revoke_community_member_invites() to service_role;

-- Public projection deliberately contains no auth IDs, codes or contacts.
create or replace function public.public_community_team(p_slug text) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('id',c.id,'slug',c.slug,'name',c.name,'tag',c.tag,'description',c.description,'archived',c.archived,
    'main_captain',(select jsonb_build_object('nickname',nickname) from public.player_profiles where id=c.main_captain),
    'second_captain',(select jsonb_build_object('nickname',nickname) from public.player_profiles where id=c.second_captain),
    'members',coalesce((select jsonb_agg(jsonb_build_object('nickname',p.nickname) order by m.joined_at,p.nickname)
      from public.community_members m join public.player_profiles p on p.id=m.profile_id
      where m.community_team_id=c.id and p.id<>c.main_captain and p.id is distinct from c.second_captain),'[]'::jsonb),
    'participations',coalesce((select jsonb_agg(jsonb_build_object('name',t.name,'slug',t.slug,'team_slug',s.slug) order by t.id desc)
      from public.registration_teams r join public.tournaments t on t.id=r.tournament_id join public.teams s on s.id=r.snapshot_team_id
      where r.community_team_id=c.id and r.status='accepted' and t.status<>'draft'),'[]'::jsonb))
    from public.community_teams c where c.slug=p_slug and length(p_slug)<=60;
$$;
