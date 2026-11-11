-- Explicitly requested next edition. No invented dates, prizes, teams or matches.
begin;
insert into public.tournaments(slug,name,edition,game,discipline,status,registration_open,roster_size,max_substitutes,description)
values('g4z-cup-13','G4Z CUP 13',13,'Dota 2','dota2','upcoming',true,5,2,
  'Открыт приём командных заявок. Создайте аккаунт, соберите состав и подайте заявку на турнир.')
on conflict(slug) do nothing;
-- A repeat never overwrites settings or reopens a tournament later closed by an organiser.
do $$ declare v_id bigint; begin
  select id into v_id from public.tournaments where slug='g4z-cup-13';
  if not exists(select 1 from public.audit_log where action='tournament.launch' and entity_id=v_id) then
    update public.tournaments set is_current=false where is_current and id<>v_id;
    update public.tournaments set is_current=true where id=v_id;
    insert into public.audit_log(action,entity,entity_id,actor_kind,summary)
      values('tournament.launch','tournament',v_id,'admin','Создан G4Z CUP 13 по Dota 2, приём заявок открыт');
  end if;
end $$;
commit;
