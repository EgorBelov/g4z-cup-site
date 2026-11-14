-- ============================================================================
-- Ссылка-приглашение в команду.
--
-- До этого приглашение в постоянный состав было только персональным: капитан
-- находил игрока по нику, и в community_member_invites появлялась строка с
-- recipient_id. Ссылку, которую можно переслать в чат, так не сделать — токен
-- живёт только в момент создания, а в базе лежит лишь его хэш.
--
-- Приглашение-ссылка — это та же строка community_member_invites, но без
-- получателя и с token_hash. Одна активная ссылка на команду: новая отзывает
-- предыдущую, срок жизни — 7 дней, вступление многоразовое (места в команде не
-- лимитированы — лимиты есть только у турнирного состава).
-- ============================================================================

-- ─── строка без получателя ──────────────────────────────────────────────────

alter table public.community_member_invites
  alter column recipient_id drop not null,
  add column token_hash text unique check (token_hash is null or token_hash ~ '^[a-f0-9]{64}$'),
  add constraint community_member_invite_target check (
    (recipient_id is null) <> (token_hash is null)
  );

comment on column public.community_member_invites.token_hash is
  'SHA-256 ссылки-приглашения в команду. Сам токен в базе не хранится.';

-- ─── уникальность: одна активная ссылка и один активный персональный инвайт ──

drop index public.community_member_invite_active;

create unique index community_member_invite_active on public.community_member_invites(
  community_team_id, recipient_id
) where status = 'active' and recipient_id is not null;

create unique index community_member_invite_link on public.community_member_invites(
  community_team_id
) where status = 'active' and token_hash is not null;

-- ─── команды ────────────────────────────────────────────────────────────────
-- Тело функции повторяет 0015; добавлены только две ветки: создание ссылки и
-- вступление по ней. Персональные приглашения остаются как были.

create or replace function public.community_member_command(p_actor uuid,p_admin boolean,p_action text,p_input jsonb,p_ip text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.community_teams; inv public.community_member_invites; target uuid; captain boolean;
begin
  perform pg_advisory_xact_lock(194713,1);
  if p_admin is distinct from false or not exists(select 1 from public.player_profiles where id=p_actor) then
    raise exception using errcode='42501',message='Требуется аккаунт игрока';
  end if;
  if p_action in ('community_accept','community_decline','community_revoke','community_link_accept') then
    select * into inv from public.community_member_invites where
      (p_input->>'token_hash' is not null and token_hash=p_input->>'token_hash') or
      (p_input->>'invite_id' is not null and id=(p_input->>'invite_id')::bigint) for update;
    if not found then raise exception 'Приглашение не найдено'; end if;
    select * into c from public.community_teams where id=inv.community_team_id for update;
  else
    select * into c from public.community_teams where id=(p_input->>'team_id')::bigint for update;
  end if;
  if c.id is null then raise exception 'Команда не найдена'; end if;
  if c.id is not null and p_input ? 'team_version' and c.version<>(p_input->>'team_version')::bigint then
    raise exception using errcode='40001',message='Команда уже изменена. Обновите страницу';
  end if;
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
  when 'community_link_create' then
    if not captain or c.archived then raise exception 'Приглашать могут только капитаны активной команды'; end if;
    if p_input->>'token_hash' is null or p_input->>'token_hash' !~ '^[a-f0-9]{64}$' then
      raise exception using errcode='22023',message='Некорректная ссылка';
    end if;
    -- Новая ссылка отключает предыдущую, включая уже истёкшую.
    update public.community_member_invites set status='revoked'
      where community_team_id=c.id and status='active' and token_hash is not null;
    insert into public.community_member_invites(community_team_id,token_hash) values(c.id,p_input->>'token_hash');
  when 'community_link_accept' then
    if inv.token_hash is null or inv.recipient_id is not null then raise exception 'Приглашение не найдено'; end if;
    if inv.status<>'active' or inv.expires_at<=now() or c.archived then raise exception 'Ссылка истекла или отозвана'; end if;
    if p_actor=c.main_captain or p_actor=c.second_captain or exists(select 1 from public.community_members where community_team_id=c.id and profile_id=p_actor) then
      raise exception 'Вы уже в этой команде';
    end if;
    -- Ссылка многоразовая: принятие не закрывает её для остальных.
    insert into public.community_members(community_team_id,profile_id) values(c.id,p_actor) on conflict do nothing;
    target:=p_actor;
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

-- create or replace сохраняет права, но фиксируем их явно — как в 0015.
revoke all on function public.community_member_command(uuid,boolean,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.community_member_command(uuid,boolean,text,jsonb,text) to service_role;
