-- Legacy tournament snapshots contain private links, too. RLS protects rows;
-- column grants protect these fields even on published rosters and direct REST.
revoke select on public.players from public, anon, authenticated;
revoke select (real_name, steam_url, dotabuff_url) on public.players from public, anon, authenticated;
grant select (id, team_id, nickname, role, is_captain, is_standin, sort_order, mmr)
  on public.players to anon, authenticated;

-- No private columns are in the Realtime publication. New profile/contact
-- tables must also explicitly revoke the defaults introduced in 0006.
