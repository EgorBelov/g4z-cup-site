-- ============================================================================
-- Состав заявки заполняется из постоянной команды.
--
-- До этого постоянная команда (community_members) и состав турнирной заявки
-- (team_members) не были связаны: капитан создавал заявку и вручную приглашал
-- в неё тех же людей, которые уже состоят в команде. На каждый турнир приходилось
-- собирать состав заново.
--
-- Теперь:
--   • при создании заявки (application_create) свободный состав заполняется
--     участниками постоянной команды — капитан, второй капитан и остальные
--     по порядку вступления; первые roster_size становятся основными, следующие
--     (не больше max_substitutes) — запасными;
--   • заявка с уже собранным составом не перезаписывается: заполнение только
--     для пустого состава (p_only_empty);
--   • повторное открытие отозванной заявки снова подставляет команду, но состав
--     не может превысить лимит турнира;
--   • игрок, уже занятый в другой заявке этого турнира, не добавляется;
--   • новое действие roster_fill дополняет непустой состав теми участниками
--     команды, для которых остались места (кнопка «Добавить участников команды»).
--
-- Каждый добавленный игрок получает событие roster_seed в истории заявки и может
-- выйти из состава сам. Права капитана по-прежнему не дают игрового слота: слот
-- занимает участие в постоянной команде, а не роль.
-- ============================================================================

-- ─── заполнение состава ─────────────────────────────────────────────────────

create or replace function public.fill_registration_roster(
  p_application bigint,
  p_only_empty boolean default true,
  p_actor_kind text default 'player'
) returns integer language plpgsql security invoker set search_path='' as $$
declare
  r public.registration_teams; c public.community_teams; t public.tournaments;
  v_count integer; v_main integer; v_inserted integer:=0; v_slot text; m record;
begin
  if p_actor_kind not in ('player','admin') then
    raise exception using errcode='22023',message='Неверный автор изменения';
  end if;
  select * into r from public.registration_teams where id=p_application;
  if not found then return 0; end if;
  select * into c from public.community_teams where id=r.community_team_id;
  select * into t from public.tournaments where id=r.tournament_id;
  select count(*),count(*) filter(where slot='main') into v_count,v_main
    from public.team_members where registration_team_id=r.id and active;
  -- Собранный состав не перезаписывается: проверенный организатором порядок
  -- основных и запасных важнее автоматического заполнения.
  if p_only_empty and v_count>0 then return 0; end if;
  if v_count>=t.roster_size+t.max_substitutes then return 0; end if;
  for m in
    with candidates as (
      select x.profile_id,min(x.priority) priority,min(x.since) since from (
        select c.main_captain profile_id,0 priority,c.created_at since where c.main_captain is not null
        union all
        select c.second_captain,1,c.created_at where c.second_captain is not null
        union all
        select cm.profile_id,2,cm.joined_at from public.community_members cm where cm.community_team_id=c.id
      ) x group by x.profile_id
    )
    select cd.profile_id from candidates cd
    where not exists (select 1 from public.team_members tm
      where tm.tournament_id=t.id and tm.profile_id=cd.profile_id and tm.active)
    order by cd.priority,cd.since,cd.profile_id
  loop
    exit when v_count>=t.roster_size+t.max_substitutes;
    v_slot:=case when v_main<t.roster_size then 'main' else 'substitute' end;
    insert into public.team_members(registration_team_id,tournament_id,profile_id,slot)
      values(r.id,t.id,m.profile_id,v_slot)
      on conflict(registration_team_id,profile_id) do update set active=true,slot=excluded.slot,joined_at=now();
    v_count:=v_count+1;
    if v_slot='main' then v_main:=v_main+1; end if;
    v_inserted:=v_inserted+1;
    insert into public.registration_events(community_team_id,registration_team_id,profile_id,action,actor_kind)
      values(c.id,r.id,m.profile_id,'roster_seed',p_actor_kind);
  end loop;
  return v_inserted;
end $$;

revoke all on function public.fill_registration_roster(bigint,boolean,text) from public,anon,authenticated;
grant execute on function public.fill_registration_roster(bigint,boolean,text) to service_role;

-- ─── команды ────────────────────────────────────────────────────────────────
-- Тело функции повторяет 0013; добавлены только вызов заполнения при создании
-- заявки (для черновика) и ветка roster_fill.

create or replace function public.registration_command(p_actor uuid,p_admin boolean,p_action text,p_input jsonb,p_ip text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  r public.registration_teams; c public.community_teams; t public.tournaments;
  inv public.team_invites; req public.captain_requests; old public.player_profiles;
  v_id bigint; v_profile uuid; v_old_app bigint; v_slot text; v_count integer; v_main integer;
  v_captain boolean:=false; v_payload jsonb:='{}'; v_changed boolean; v_rating_dota integer; v_rating_cs integer;
begin
  -- Serializing this small control plane makes membership/capacity/role changes
  -- atomic across applications, including concurrent invites and admin moves.
  perform pg_advisory_xact_lock(194713,1);
  if p_admin is null or (not p_admin and not exists(select 1 from public.player_profiles where id=p_actor)) then
    raise exception using errcode='42501',message='Требуется аккаунт игрока';
  end if;
  if p_input ? 'application_id' then
    select * into r from public.registration_teams where id=(p_input->>'application_id')::bigint for update;
    if not found then raise exception 'Заявка не найдена'; end if;
  end if;
  if p_action in ('invite_accept','invite_decline','invite_revoke') then
    select * into inv from public.team_invites where
      (p_input->>'token_hash' is not null and token_hash=p_input->>'token_hash') or
      (p_input->>'invite_id' is not null and id=(p_input->>'invite_id')::bigint) for update;
    if not found then raise exception 'Приглашение не найдено'; end if;
    if r.id is not null and r.id<>inv.registration_team_id then raise exception 'Чужое приглашение'; end if;
    select * into r from public.registration_teams where id=inv.registration_team_id for update;
  end if;
  if p_action in ('captain_accept','captain_decline','captain_revoke') then
    select * into req from public.captain_requests where id=(p_input->>'request_id')::bigint for update;
    if not found then raise exception 'Запрос не найден'; end if;
    select * into c from public.community_teams where id=req.community_team_id for update;
  elsif r.id is not null then select * into c from public.community_teams where id=r.community_team_id for update;
  elsif p_input ? 'team_id' then
    select * into c from public.community_teams where id=(p_input->>'team_id')::bigint for update;
    if not found then raise exception 'Команда не найдена'; end if;
  end if;
  if r.id is not null then select * into t from public.tournaments where id=r.tournament_id for update;
  elsif p_input ? 'tournament_id' then
    select * into t from public.tournaments where id=(p_input->>'tournament_id')::bigint for update;
    if not found or t.status='draft' then raise exception 'Турнир не найден'; end if;
  end if;
  v_captain:=coalesce(p_admin or (c.id is not null and (c.main_captain=p_actor or c.second_captain=p_actor)),false);
  if r.id is not null and p_input ? 'version' and r.version<>(p_input->>'version')::bigint then
    raise exception using errcode='40001',message='Заявка уже изменена. Обновите страницу';
  end if;
  if c.id is not null and p_input ? 'team_version' and c.version<>(p_input->>'team_version')::bigint then
    raise exception using errcode='40001',message='Команда уже изменена. Обновите страницу';
  end if;

  case p_action
  when 'profile_update' then
    select * into strict old from public.player_profiles where id=p_actor;
    if old.version<>(p_input->>'version')::bigint then raise exception 'Профиль уже изменён. Обновите страницу'; end if;
    select value into v_rating_dota from public.player_ratings where profile_id=p_actor and discipline='dota2';
    select value into v_rating_cs from public.player_ratings where profile_id=p_actor and discipline='cs2';
    v_changed:=old.nickname is distinct from p_input->>'nickname' or old.telegram_username is distinct from p_input->>'telegram_username'
      or old.steam_url is distinct from p_input->>'steam_url' or old.faceit_url is distinct from p_input->>'faceit_url' or old.dotabuff_url is distinct from p_input->>'dotabuff_url';
    update public.player_profiles set nickname=p_input->>'nickname',telegram_username=p_input->>'telegram_username',
      telegram_contact_verified=lower(p_input->>'telegram_username')=lower(coalesce(p_input->>'verified_username','')),
      steam_url=p_input->>'steam_url',faceit_url=p_input->>'faceit_url',dotabuff_url=p_input->>'dotabuff_url',version=version+1,updated_at=now() where id=p_actor;
    delete from public.player_ratings where profile_id=p_actor;
    if p_input->>'dota_mmr' is not null then insert into public.player_ratings values(p_actor,'dota2',(p_input->>'dota_mmr')::integer); end if;
    if p_input->>'cs_elo' is not null then insert into public.player_ratings values(p_actor,'cs2',(p_input->>'cs_elo')::integer); end if;
    update public.registration_teams a set status=case when a.status in ('submitted','waitlisted') then 'draft' else a.status end,version=a.version+1,updated_at=now()
      from public.tournaments tt where tt.id=a.tournament_id and a.status not in ('accepted','withdrawn')
      and exists(select 1 from public.team_members m where m.registration_team_id=a.id and m.profile_id=p_actor and m.active)
      and (v_changed or (tt.discipline='dota2' and v_rating_dota is distinct from (p_input->>'dota_mmr')::integer)
        or (tt.discipline='cs2' and v_rating_cs is distinct from (p_input->>'cs_elo')::integer));
  when 'team_create' then
    insert into public.community_teams(slug,name,tag,description,main_captain)
      values(p_input->>'slug',p_input->>'name',p_input->>'tag',p_input->>'description',p_actor) returning * into c;
    v_payload:=jsonb_build_object('team_id',c.id,'slug',c.slug);
  when 'team_update' then
    if not v_captain or c.archived then raise exception 'Нет прав управления командой'; end if;
    update public.community_teams set name=p_input->>'name',tag=p_input->>'tag',description=p_input->>'description',version=version+1 where id=c.id;
    update public.registration_teams set status=case when status in ('submitted','waitlisted') then 'draft' else status end,version=version+1
      where community_team_id=c.id and status not in ('accepted','withdrawn');
  when 'team_archive','team_restore' then
    if not p_admin and c.main_captain is distinct from p_actor then raise exception 'Только главный капитан может закрыть команду'; end if;
    if p_action='team_restore' and not p_admin then raise exception 'Восстановление доступно организатору'; end if;
    if not p_admin and exists(select 1 from public.registration_teams a join public.tournaments tt on tt.id=a.tournament_id
      where a.community_team_id=c.id and a.status<>'withdrawn' and (a.status<>'accepted' or tt.status<>'finished')) then
      raise exception 'Сначала отзовите непринятые заявки. С активным принятым участием обратитесь к организатору';
    end if;
    update public.community_teams set archived=(p_action='team_archive'),version=version+1 where id=c.id;
    update public.team_invites set status='revoked' where status='active' and registration_team_id in(select id from public.registration_teams where community_team_id=c.id);
  when 'application_create' then
    if not v_captain or c.archived or (not p_admin and (not t.registration_open or t.status='finished')) then raise exception 'Создание заявки недоступно'; end if;
    insert into public.registration_teams(tournament_id,community_team_id) values(t.id,c.id)
      on conflict(tournament_id,community_team_id) do update set status=case when registration_teams.status='withdrawn' then 'draft' else registration_teams.status end,
        version=registration_teams.version+case when registration_teams.status='withdrawn' then 1 else 0 end returning * into r;
    -- Новая заявка сразу получает состав постоянной команды. Принятую, поданную
    -- или отклонённую заявку заполнение не трогает: меняет её только организатор.
    if r.status='draft' then
      perform public.fill_registration_roster(r.id,true,case when p_admin then 'admin' else 'player' end);
    end if;
    v_payload:=jsonb_build_object('application_id',r.id);
  when 'interest' then
    if t.id is null or (not t.registration_open or t.status='finished') and (p_input->>'active')::boolean then raise exception 'Приём пожеланий закрыт'; end if;
    insert into public.participation_interests(tournament_id,profile_id,active) values(t.id,p_actor,(p_input->>'active')::boolean)
      on conflict(tournament_id,profile_id) do update set active=excluded.active;
  when 'invite_create','invite_revoke' then
    if not v_captain or c.archived or r.id is null then raise exception 'Нет прав на приглашения'; end if;
    if p_action='invite_create' then
      if not p_admin and (not t.registration_open or t.status='finished' or r.status in ('accepted','withdrawn')) then raise exception 'Состав заблокирован'; end if;
      if p_input->>'recipient_id' is null then
        update public.team_invites set status='revoked' where registration_team_id=r.id and status='active' and token_hash is not null;
      else
        update public.team_invites set status='revoked' where registration_team_id=r.id and status='active' and recipient_id=(p_input->>'recipient_id')::uuid;
      end if;
      insert into public.team_invites(registration_team_id,recipient_id,token_hash) values(r.id,(p_input->>'recipient_id')::uuid,p_input->>'token_hash') returning id into v_id;
      v_payload:=jsonb_build_object('invite_id',v_id);
    else update public.team_invites set status='revoked' where id=inv.id; end if;
  when 'invite_accept','invite_decline','self_join' then
    if p_action<>'self_join' and inv.recipient_id is not null and inv.recipient_id<>p_actor then raise exception 'Это приглашение другому игроку'; end if;
    if p_action='invite_decline' then
      if inv.recipient_id is null then raise exception 'Ссылку можно только не принимать'; end if;
      if inv.status<>'active' then raise exception 'Приглашение недоступно'; end if;
      update public.team_invites set status='rejected' where id=inv.id;
    else
      if exists(select 1 from public.team_members where registration_team_id=r.id and profile_id=p_actor and active) then return jsonb_build_object('application_id',r.id); end if;
      if c.archived or not t.registration_open or t.status='finished' or r.status in ('accepted','withdrawn') then raise exception 'Состав заблокирован'; end if;
      if p_action='self_join' and not v_captain then raise exception 'Требуется приглашение'; end if;
      if p_action='invite_accept' and (inv.status<>'active' or inv.expires_at<=now()) then raise exception 'Срок приглашения истёк или оно отозвано'; end if;
      if exists(select 1 from public.team_members where tournament_id=t.id and profile_id=p_actor and active) then raise exception 'Вы уже в другом составе этого турнира'; end if;
      select count(*),count(*) filter(where slot='main') into v_count,v_main from public.team_members where registration_team_id=r.id and active;
      if v_count>=t.roster_size+t.max_substitutes then raise exception 'В составе нет свободных мест'; end if;
      v_slot:=case when v_main<t.roster_size then 'main' else 'substitute' end;
      insert into public.team_members(registration_team_id,tournament_id,profile_id,slot) values(r.id,t.id,p_actor,v_slot)
        on conflict(registration_team_id,profile_id) do update set active=true,slot=excluded.slot,joined_at=now();
      if inv.recipient_id is not null then update public.team_invites set status='accepted' where id=inv.id; end if;
      update public.registration_teams set status=case when status in ('submitted','waitlisted') then 'draft' else status end,version=version+1,updated_at=now() where id=r.id;
    end if;
  when 'member_slot','member_remove','member_leave','admin_member' then
    if r.id is null then raise exception 'Заявка не найдена'; end if;
    if p_action='admin_member' and not p_admin then raise exception 'Только организатор может добавлять напрямую'; end if;
    if not p_admin and (c.archived or not t.registration_open or t.status='finished' or r.status in ('accepted','withdrawn')) then raise exception 'Состав заблокирован'; end if;
    if p_action<>'member_leave' and not v_captain then raise exception 'Нет прав на состав'; end if;
    v_profile:=case when p_action='member_leave' then p_actor else (p_input->>'profile_id')::uuid end;
    if p_action in ('member_remove','member_leave') then
      update public.team_members set active=false where registration_team_id=r.id and profile_id=v_profile and active;
      if not found then raise exception 'Игрок не найден в составе'; end if;
    else
      v_slot:=p_input->>'slot';
      if v_slot not in ('main','substitute') or v_slot is null then raise exception 'Неверный слот'; end if;
      if p_action='admin_member' then
        if p_input->>'replace_profile_id' is not null then
          update public.team_members set active=false where registration_team_id=r.id and profile_id=(p_input->>'replace_profile_id')::uuid;
          if not found then raise exception 'Заменяемый игрок не найден в составе'; end if;
        end if;
        select registration_team_id into v_old_app from public.team_members where tournament_id=t.id and profile_id=v_profile and active;
        if v_old_app is not null and v_old_app<>r.id then
          update public.team_members set active=false where tournament_id=t.id and profile_id=v_profile and active;
          update public.registration_teams set status=case when status in ('submitted','waitlisted') then 'draft' else status end,version=version+1 where id=v_old_app;
          perform public.sync_registration_snapshot(v_old_app);
          insert into public.registration_events(registration_team_id,profile_id,action,reason,actor_kind) values(v_old_app,v_profile,'admin_move',p_input->>'reason','admin');
        end if;
      elsif not exists(select 1 from public.team_members where registration_team_id=r.id and profile_id=v_profile and active) then raise exception 'Игрок не найден в составе'; end if;
      select count(*),count(*) filter(where slot='main') into v_count,v_main from public.team_members where registration_team_id=r.id and active and profile_id<>v_profile;
      if v_count>=t.roster_size+t.max_substitutes or (v_slot='main' and v_main>=t.roster_size)
        or (v_slot='substitute' and v_count-v_main>=t.max_substitutes) then raise exception 'Нет свободного места выбранного типа'; end if;
      insert into public.team_members(registration_team_id,tournament_id,profile_id,slot) values(r.id,t.id,v_profile,v_slot)
        on conflict(registration_team_id,profile_id) do update set active=true,slot=excluded.slot,joined_at=now();
    end if;
    update public.registration_teams set status=case when status in ('submitted','waitlisted') then 'draft' else status end,version=version+1,updated_at=now() where id=r.id;
    if p_admin then perform public.sync_registration_snapshot(r.id); end if;
  when 'roster_fill' then
    if r.id is null then raise exception 'Заявка не найдена'; end if;
    if not p_admin and (c.archived or not t.registration_open or t.status='finished' or r.status in ('accepted','withdrawn')) then raise exception 'Состав заблокирован'; end if;
    if not v_captain then raise exception 'Нет прав на состав'; end if;
    perform public.fill_registration_roster(r.id,false,case when p_admin then 'admin' else 'player' end);
    update public.registration_teams set status=case when status in ('submitted','waitlisted') then 'draft' else status end,version=version+1,updated_at=now() where id=r.id;
    if p_admin then perform public.sync_registration_snapshot(r.id); end if;
  when 'submit','withdraw','review' then
    if not v_captain then raise exception 'Нет прав на заявку'; end if;
    if p_action='review' and not p_admin then raise exception 'Только организатор может рассматривать заявку'; end if;
    if p_action='withdraw' then
      if r.status='accepted' then raise exception 'Принятую заявку меняет организатор'; end if;
      update public.registration_teams set status='withdrawn',version=version+1,updated_at=now() where id=r.id;
      update public.team_members set active=false where registration_team_id=r.id;
      update public.team_invites set status='revoked' where registration_team_id=r.id and status='active';
    else
      if p_action='submit' and (c.archived or not t.registration_open or t.status='finished' or r.status in ('accepted','withdrawn')) then raise exception 'Подача заявки недоступна'; end if;
      if p_action='review' and (p_input->>'status' not in ('accepted','rejected','waitlisted') or r.status not in ('submitted','waitlisted','rejected')) then raise exception 'Заявка не ожидает решения'; end if;
      if p_action='submit' or p_input->>'status'='accepted' then
        select count(*),count(*) filter(where slot='main') into v_count,v_main from public.team_members where registration_team_id=r.id and active;
        if v_main<>t.roster_size or v_count-v_main>t.max_substitutes then raise exception 'Нужно % основных и не более % запасных',t.roster_size,t.max_substitutes; end if;
      end if;
      if p_action='review' and p_input->>'status'='rejected' and length(trim(coalesce(p_input->>'reason','')))=0 then raise exception 'Укажите причину отказа'; end if;
      update public.registration_teams set status=case when p_action='submit' then 'submitted' else p_input->>'status' end,
        reason=case when p_action='review' then p_input->>'reason' else null end,version=version+1,updated_at=now() where id=r.id;
      insert into public.registration_revisions(registration_team_id,version,snapshot)
        select r.id,a.version,public.registration_snapshot(r.id) from public.registration_teams a where a.id=r.id;
      perform public.sync_registration_snapshot(r.id);
    end if;
  when 'captain_request','captain_direct','second_remove' then
    if not p_admin and c.main_captain is distinct from p_actor then raise exception 'Только главный капитан управляет ролями'; end if;
    if c.archived and not p_admin then raise exception 'Команда закрыта'; end if;
    if p_action='second_remove' then update public.community_teams set second_captain=null,version=version+1 where id=c.id;
    else
      v_profile:=(p_input->>'recipient_id')::uuid;
      if v_profile is null or not exists(select 1 from public.player_profiles where id=v_profile) then raise exception 'Игрок не найден'; end if;
      if p_input->>'role' not in ('main','second') then raise exception 'Неизвестная роль'; end if;
      if v_profile=c.main_captain and p_input->>'role'='second' then raise exception 'Капитаны должны быть разными игроками'; end if;
      if p_action='captain_direct' then
        if not p_admin then raise exception 'Только организатор назначает напрямую'; end if;
        update public.community_teams set main_captain=case when p_input->>'role'='main' then v_profile else main_captain end,
          second_captain=case when p_input->>'role'='second' then v_profile when second_captain=v_profile then null else second_captain end,version=version+1 where id=c.id;
        update public.captain_requests set status='revoked' where community_team_id=c.id and status='pending';
      else
        if v_profile=p_actor then raise exception 'Нельзя назначить себя'; end if;
        update public.captain_requests set status='revoked' where community_team_id=c.id and role=p_input->>'role' and status='pending';
        insert into public.captain_requests(community_team_id,initiator_id,recipient_id,role) values(c.id,p_actor,v_profile,p_input->>'role');
      end if;
    end if;
  when 'captain_accept','captain_decline','captain_revoke' then
    if req.status<>'pending' then raise exception 'Запрос недоступен'; end if;
    if p_action='captain_revoke' then
      if not p_admin and c.main_captain is distinct from p_actor then raise exception 'Нет прав на отзыв'; end if;
      update public.captain_requests set status='revoked' where id=req.id;
    else
      if req.recipient_id is distinct from p_actor then raise exception 'Запрос другому игроку'; end if;
      if req.expires_at<=now() or c.archived or c.main_captain<>req.initiator_id then raise exception 'Запрос истёк или инициатор уже не капитан'; end if;
      if p_action='captain_accept' then
        update public.community_teams set main_captain=case when req.role='main' then p_actor else main_captain end,
          second_captain=case when req.role='second' then p_actor when second_captain=p_actor then null else second_captain end,version=version+1 where id=c.id;
        update public.captain_requests set status='revoked' where community_team_id=c.id and status='pending' and id<>req.id;
      end if;
      update public.captain_requests set status=case when p_action='captain_accept' then 'accepted' else 'rejected' end where id=req.id;
    end if;
  else raise exception 'Неизвестное действие';
  end case;

  insert into public.audit_log(action,entity,entity_id,actor_kind,actor_id,ip,summary,payload)
    values('registration.'||p_action,'registration',r.id,case when p_admin then 'admin' else 'player' end,p_actor,p_ip,
      coalesce(p_input->>'reason',p_action),jsonb_build_object('application_id',r.id,'community_team_id',c.id,'profile_id',v_profile));
  insert into public.registration_events(community_team_id,registration_team_id,profile_id,action,reason,actor_kind,actor_id)
    values(c.id,r.id,coalesce(v_profile,p_actor),p_action,p_input->>'reason',case when p_admin then 'admin' else 'player' end,p_actor);
  return v_payload||jsonb_build_object('application_id',r.id,'team_id',c.id,'slug',c.slug,'tournament_slug',t.slug);
end $$;

revoke all on function public.registration_command(uuid,boolean,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.registration_command(uuid,boolean,text,jsonb,text) to service_role;
