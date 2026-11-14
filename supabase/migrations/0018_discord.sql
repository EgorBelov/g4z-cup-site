-- ============================================================================
-- Discord: identity of the player, the team's voice channel and the roles the
-- bot has already granted.
--
-- Tokens are stored only as AES-256-GCM ciphertext; the plaintext never leaves
-- the server action that receives it. Discord ids are snowflakes (17-20 digits).
-- ============================================================================

alter table public.player_profiles
  add column discord_id text unique check (discord_id is null or discord_id ~ '^[0-9]{17,20}$'),
  add column discord_username text check (discord_username is null or length(discord_username) between 1 and 64),
  add column discord_linked_at timestamptz,
  add column discord_token_enc text,
  add column discord_refresh_enc text,
  add column discord_token_expires_at timestamptz,
  add column discord_in_guild boolean not null default false;

-- A player who is not on the server has no business looking like a member.
alter table public.player_profiles
  add check (discord_linked_at is null or discord_id is not null);

alter table public.community_teams
  add column discord_role_id text check (discord_role_id is null or discord_role_id ~ '^[0-9]{17,20}$'),
  add column discord_voice_channel_id text check (discord_voice_channel_id is null or discord_voice_channel_id ~ '^[0-9]{17,20}$'),
  add column discord_synced_at timestamptz,
  add column discord_error text check (discord_error is null or length(discord_error) <= 500);

-- Discord has no cheap way to list "who holds this role" for a bot without the
-- privileged GUILD_MEMBERS intent. Remembering every grant makes revocation
-- exact and keeps the bot free of extra intents.
create table public.discord_role_grants (
  profile_id uuid not null references public.player_profiles(id) on delete cascade,
  role_id text not null check (role_id ~ '^[0-9]{17,20}$'),
  granted_at timestamptz not null default now(),
  primary key (profile_id, role_id)
);
create index discord_role_grants_role on public.discord_role_grants(role_id);

alter table public.discord_role_grants enable row level security;
revoke all on public.discord_role_grants from public, anon, authenticated;
grant all on public.discord_role_grants to service_role;

-- Leftovers from a deleted profile must not stay attached to a Discord member.
create function public.forget_discord_grants() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.discord_role_grants where profile_id = old.id;
  return old;
end $$;
create trigger player_profiles_forget_discord before delete on public.player_profiles
for each row execute function public.forget_discord_grants();
revoke all on function public.forget_discord_grants() from public, anon, authenticated;
grant execute on function public.forget_discord_grants() to service_role;

-- One Discord account belongs to exactly one player.
comment on column public.player_profiles.discord_id is
  'Discord snowflake, unique. Null when the player has not linked Discord.';
comment on table public.discord_role_grants is
  'Roles the bot has granted; source of truth for exact revocation.';
