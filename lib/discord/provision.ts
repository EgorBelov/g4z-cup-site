import "server-only";

import { discord, DiscordError } from "@/lib/discord/rest";
import { discordConfigured, discordConfig } from "@/lib/discord/config";
import {
  ROLE_COLOR,
  sanitizeName,
  teamChannelOverwrites,
} from "@/lib/discord/permissions";
import { openToken, sealToken } from "@/lib/discord/tokens";
import {
  refreshTokens,
  type DiscordTokens,
  type DiscordUser,
} from "@/lib/discord/oauth";
import { writeClient } from "@/lib/supabase/write";
import { audit } from "@/lib/audit";

/**
 * Discord provisioning.
 *
 * Everything here is idempotent: the same team synced twice makes no new roles
 * or channels. Failures never roll back the site mutation — they are written to
 * `community_teams.discord_error` and can be retried from the cabinet.
 */

type ProfileRow = {
  id: string;
  discord_id: string | null;
  discord_username: string | null;
  discord_in_guild: boolean;
  discord_token_enc: string | null;
  discord_refresh_enc: string | null;
  discord_token_expires_at: string | null;
};

type TeamRow = {
  id: number;
  name: string;
  archived: boolean;
  main_captain: string;
  second_captain: string | null;
  discord_role_id: string | null;
  discord_voice_channel_id: string | null;
};

const PROFILE_COLUMNS =
  "id,discord_id,discord_username,discord_in_guild,discord_token_enc,discord_refresh_enc,discord_token_expires_at";

function describe(cause: unknown): string {
  if (cause instanceof DiscordError) {
    const hint =
      cause.status === 403
        ? " — проверьте права бота и его позицию выше роли «Капитан»"
        : "";
    return `Discord ${cause.status}: ${cause.message}${hint}`;
  }
  return cause instanceof Error ? cause.message : "Неизвестная ошибка Discord";
}

async function loadTeam(teamId: number): Promise<TeamRow | null> {
  const { data, error } = await writeClient()
    .from("community_teams")
    .select(
      "id,name,archived,main_captain,second_captain,discord_role_id,discord_voice_channel_id",
    )
    .eq("id", teamId)
    .maybeSingle();
  if (error) throw new Error("Не удалось загрузить команду для Discord");
  return (data as TeamRow | null) ?? null;
}

async function updateTeam(teamId: number, patch: Record<string, unknown>) {
  const { error } = await writeClient()
    .from("community_teams")
    .update(patch)
    .eq("id", teamId);
  if (error) throw new Error("Не удалось сохранить состояние Discord команды");
}

async function loadProfile(profileId: string): Promise<ProfileRow | null> {
  const { data, error } = await writeClient()
    .from("player_profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", profileId)
    .maybeSingle();
  if (error) throw new Error("Не удалось загрузить профиль для Discord");
  return (data as ProfileRow | null) ?? null;
}

async function markInGuild(profileId: string, value: boolean) {
  await writeClient()
    .from("player_profiles")
    .update({ discord_in_guild: value })
    .eq("id", profileId);
}

async function saveTokens(profileId: string, tokens: DiscordTokens) {
  await writeClient()
    .from("player_profiles")
    .update({
      discord_token_enc: sealToken(tokens.access_token),
      discord_refresh_enc: tokens.refresh_token
        ? sealToken(tokens.refresh_token)
        : null,
      discord_token_expires_at: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
    })
    .eq("id", profileId);
}

async function accessTokenFor(profile: ProfileRow): Promise<string | null> {
  const access = openToken(profile.discord_token_enc);
  const expiresAt = profile.discord_token_expires_at
    ? new Date(profile.discord_token_expires_at).getTime()
    : 0;
  if (access && expiresAt - 60_000 > Date.now()) return access;

  const refresh = openToken(profile.discord_refresh_enc);
  if (!refresh) return access;

  try {
    const tokens = await refreshTokens(refresh);
    await saveTokens(profile.id, tokens);
    return tokens.access_token;
  } catch {
    // Revoked or expired: the player has to link Discord again.
    return null;
  }
}

/** `guilds.join`, so a player who linked Discord ends up on the server. */
async function ensureGuildMember(
  profile: ProfileRow,
): Promise<{ ok: boolean; error?: string }> {
  if (!profile.discord_id) return { ok: false };
  if (profile.discord_in_guild) return { ok: true };

  const accessToken = await accessTokenFor(profile);
  if (!accessToken) return { ok: false };

  try {
    await discord.addMember(profile.discord_id, accessToken);
    await markInGuild(profile.id, true);
    return { ok: true };
  } catch (cause) {
    await markInGuild(profile.id, false);
    return { ok: false, error: describe(cause) };
  }
}

/**
 * Reconciles one role against a desired set of profiles.
 *
 * `discord_role_grants` records what the bot has actually granted, so revoking
 * does not require the privileged GUILD_MEMBERS intent or a member list.
 */
async function applyRoles(roleId: string, desired: string[]): Promise<string[]> {
  const client = writeClient();
  const { data: grantRows, error: grantError } = await client
    .from("discord_role_grants")
    .select("profile_id")
    .eq("role_id", roleId);
  if (grantError) throw new Error("Не удалось прочитать выданные роли Discord");

  const granted = new Set((grantRows ?? []).map((row) => row.profile_id as string));
  const ids = [...new Set([...desired, ...granted])];
  if (!ids.length) return [];

  const { data: profileRows, error } = await client
    .from("player_profiles")
    .select(PROFILE_COLUMNS)
    .in("id", ids);
  if (error) throw new Error("Не удалось загрузить профили для ролей Discord");

  const profiles = new Map(
    (profileRows as ProfileRow[]).map((profile) => [profile.id, profile]),
  );
  const wanted = new Set(desired);
  const errors: string[] = [];

  for (const id of ids) {
    const profile = profiles.get(id);
    if (!profile?.discord_id) continue;
    const shouldHave = wanted.has(id);
    const has = granted.has(id);

    if (shouldHave && !has) {
      const member = await ensureGuildMember(profile);
      if (!member.ok) {
        if (member.error)
          errors.push(`${profile.discord_username ?? id}: ${member.error}`);
        continue;
      }
      try {
        await discord.addRole(profile.discord_id, roleId);
        const { error: insertError } = await client
          .from("discord_role_grants")
          .insert({ profile_id: id, role_id: roleId });
        if (insertError && insertError.code !== "23505")
          errors.push(`не удалось записать роль ${roleId}`);
      } catch (cause) {
        errors.push(`${profile.discord_username ?? id}: ${describe(cause)}`);
        if (cause instanceof DiscordError && cause.notFound) {
          await markInGuild(id, false);
        }
      }
      continue;
    }

    if (!shouldHave && has) {
      try {
        await discord.removeRole(profile.discord_id, roleId);
      } catch (cause) {
        if (!(cause instanceof DiscordError && cause.notFound))
          errors.push(`${profile.discord_username ?? id}: ${describe(cause)}`);
        if (cause instanceof DiscordError && cause.notFound) {
          await markInGuild(id, false);
        }
      }
      await client
        .from("discord_role_grants")
        .delete()
        .eq("profile_id", id)
        .eq("role_id", roleId);
    }
  }

  return errors;
}

async function teamProfileIds(team: TeamRow): Promise<string[]> {
  const { data, error } = await writeClient()
    .from("community_members")
    .select("profile_id")
    .eq("community_team_id", team.id);
  if (error) throw new Error("Не удалось загрузить участников команды");
  return [
    ...new Set([
      team.main_captain,
      ...(team.second_captain ? [team.second_captain] : []),
      ...(data ?? []).map((row) => row.profile_id as string),
    ]),
  ];
}

/** Captains of every open team hold the global captain role. */
export async function syncCaptainRoles(): Promise<string[]> {
  if (!discordConfigured()) return [];
  const { captainRoleId } = discordConfig();
  const { data, error } = await writeClient()
    .from("community_teams")
    .select("main_captain,second_captain")
    .eq("archived", false);
  if (error) throw new Error("Не удалось загрузить капитанов");

  const desired = new Set<string>();
  for (const team of data ?? []) {
    desired.add(team.main_captain as string);
    if (team.second_captain) desired.add(team.second_captain as string);
  }
  return applyRoles(captainRoleId, [...desired]);
}

async function ensureRole(team: TeamRow): Promise<string> {
  const name = sanitizeName(team.name);

  if (team.discord_role_id) {
    try {
      const role = await discord.role(team.discord_role_id);
      if (role.name !== name)
        await discord.modifyRole(role.id, { name, color: ROLE_COLOR });
      return role.id;
    } catch (cause) {
      if (!(cause instanceof DiscordError && cause.notFound)) throw cause;
      // Deleted by hand in Discord: forget it and create a new one.
      await updateTeam(team.id, { discord_role_id: null });
    }
  }

  // Teams that existed before automation already have hand-made roles: adopt
  // an exact single match instead of creating a duplicate next to it.
  const existing = (await discord.roles()).filter(
    (role) => !role.managed && role.name === name,
  );
  const adoptedRole = existing.length === 1 ? existing[0] : undefined;
  if (adoptedRole) {
    await updateTeam(team.id, { discord_role_id: adoptedRole.id });
    return adoptedRole.id;
  }

  const role = await discord.createRole({ name, color: ROLE_COLOR });
  await updateTeam(team.id, { discord_role_id: role.id });
  return role.id;
}

async function findVoiceChannel(name: string): Promise<string | null> {
  const { teamsCategoryId } = discordConfig();
  const matches = (await discord.channels()).filter(
    (channel) =>
      channel.type === 2 &&
      channel.parent_id === teamsCategoryId &&
      channel.name === name,
  );
  return matches.length === 1 ? (matches[0]?.id ?? null) : null;
}

async function ensureChannel(team: TeamRow, roleId: string): Promise<string> {
  const { guildId, teamsCategoryId, captainRoleId } = discordConfig();
  const name = sanitizeName(team.name);
  const overwrites = teamChannelOverwrites({
    guildId,
    teamRoleId: roleId,
    captainRoleId,
  });

  if (!team.discord_voice_channel_id) {
    const adopted = await findVoiceChannel(name);
    if (adopted) {
      team.discord_voice_channel_id = adopted;
      await updateTeam(team.id, { discord_voice_channel_id: adopted });
    }
  }

  if (team.discord_voice_channel_id) {
    try {
      const channel = await discord.channel(team.discord_voice_channel_id);
      await discord.modifyChannel(channel.id, {
        name,
        parent_id: teamsCategoryId,
        permission_overwrites: overwrites,
      });
      return channel.id;
    } catch (cause) {
      if (!(cause instanceof DiscordError && cause.notFound)) throw cause;
      await updateTeam(team.id, { discord_voice_channel_id: null });
    }
  }

  let channel;
  try {
    channel = await discord.createChannel({
      name,
      type: 2,
      parent_id: teamsCategoryId,
      permission_overwrites: overwrites,
    });
  } catch (cause) {
    if (!(cause instanceof DiscordError && cause.notFound)) throw cause;
    // The configured category is gone: a channel in the root is better than no
    // channel at all, and the admin can fix the category afterwards.
    channel = await discord.createChannel({
      name,
      type: 2,
      parent_id: null,
      permission_overwrites: overwrites,
    });
  }
  await updateTeam(team.id, { discord_voice_channel_id: channel.id });
  return channel.id;
}

async function syncTeamNow(team: TeamRow): Promise<string[]> {
  const errors: string[] = [];

  const roleId = await ensureRole(team);
  const channelId = await ensureChannel(team, roleId);
  errors.push(...(await applyRoles(roleId, await teamProfileIds(team))));
  errors.push(...(await syncCaptainRoles()));

  await updateTeam(team.id, {
    discord_role_id: roleId,
    discord_voice_channel_id: channelId,
    discord_synced_at: new Date().toISOString(),
    discord_error: errors.length ? errors.join("; ").slice(0, 500) : null,
  });

  return errors;
}

async function removeTeamDiscord(team: TeamRow): Promise<string[]> {
  const errors: string[] = [];

  if (team.discord_voice_channel_id) {
    try {
      await discord.deleteChannel(team.discord_voice_channel_id);
    } catch (cause) {
      if (!(cause instanceof DiscordError && cause.notFound))
        errors.push(describe(cause));
    }
  }

  if (team.discord_role_id) {
    try {
      await discord.deleteRole(team.discord_role_id);
    } catch (cause) {
      if (!(cause instanceof DiscordError && cause.notFound))
        errors.push(describe(cause));
    }
    await writeClient()
      .from("discord_role_grants")
      .delete()
      .eq("role_id", team.discord_role_id);
  }

  await updateTeam(team.id, {
    discord_role_id: null,
    discord_voice_channel_id: null,
    discord_synced_at: new Date().toISOString(),
    discord_error: errors.length ? errors.join("; ").slice(0, 500) : null,
  });

  errors.push(...(await syncCaptainRoles()));
  return errors;
}

/** Public entry point: never throws, records the failure for the cabinet. */
export async function syncTeam(teamId: number): Promise<void> {
  if (!discordConfigured()) return;

  let team: TeamRow | null;
  try {
    team = await loadTeam(teamId);
  } catch (cause) {
    console.error("discord sync: cannot load team", cause);
    return;
  }
  if (!team) return;

  try {
    const errors = team.archived
      ? await removeTeamDiscord(team)
      : await syncTeamNow(team);
    if (errors.length) {
      await audit({
        action: "discord.sync",
        entity: "community_team",
        entityId: team.id,
        summary: errors.join("; ").slice(0, 500),
      });
    }
  } catch (cause) {
    const message = describe(cause).slice(0, 500);
    await writeClient()
      .from("community_teams")
      .update({ discord_error: message })
      .eq("id", team.id);
    await audit({
      action: "discord.sync",
      entity: "community_team",
      entityId: team.id,
      summary: message,
    });
  }
}

/** Teams a player is part of: membership or captaincy. */
export async function playerTeamIds(profileId: string): Promise<number[]> {
  const client = writeClient();
  const [membership, captain] = await Promise.all([
    client
      .from("community_members")
      .select("community_team_id")
      .eq("profile_id", profileId),
    client
      .from("community_teams")
      .select("id")
      .eq("archived", false)
      .or(`main_captain.eq.${profileId},second_captain.eq.${profileId}`),
  ]);
  if (membership.error || captain.error)
    throw new Error("Не удалось загрузить команды игрока");
  return [
    ...new Set([
      ...(membership.data ?? []).map((row) => row.community_team_id as number),
      ...(captain.data ?? []).map((row) => row.id as number),
    ]),
  ];
}

/** Saves the link, adds the player to the server and syncs their roles. */
export async function linkDiscord(
  profileId: string,
  input: { user: DiscordUser; tokens: DiscordTokens },
): Promise<string[]> {
  const client = writeClient();
  const { error } = await client
    .from("player_profiles")
    .update({
      discord_id: input.user.id,
      discord_username: input.user.global_name || input.user.username,
      discord_linked_at: new Date().toISOString(),
      discord_token_enc: sealToken(input.tokens.access_token),
      discord_refresh_enc: input.tokens.refresh_token
        ? sealToken(input.tokens.refresh_token)
        : null,
      discord_token_expires_at: input.tokens.expires_in
        ? new Date(Date.now() + input.tokens.expires_in * 1000).toISOString()
        : null,
    })
    .eq("id", profileId);

  if (error) {
    if (error.code === "23505")
      throw new Error("Этот Discord уже привязан к другому аккаунту");
    throw new Error("Не удалось сохранить привязку Discord");
  }

  const errors: string[] = [];
  let inGuild = false;
  try {
    await discord.addMember(input.user.id, input.tokens.access_token);
    inGuild = true;
  } catch (cause) {
    errors.push(describe(cause));
  }
  await markInGuild(profileId, inGuild);

  if (inGuild) {
    errors.push(...(await syncCaptainRoles()));
    for (const teamId of await playerTeamIds(profileId)) await syncTeam(teamId);
  } else {
    // Roles cannot be granted to someone who is not on the server.
    await audit({
      action: "discord.link",
      entity: "player_profile",
      summary: errors.join("; ").slice(0, 500),
    });
  }

  return errors;
}

/** Removes every granted role, then forgets the Discord account. */
export async function unlinkDiscord(profileId: string): Promise<void> {
  const profile = await loadProfile(profileId);

  if (discordConfigured() && profile?.discord_id) {
    const { data: grants, error } = await writeClient()
      .from("discord_role_grants")
      .select("role_id")
      .eq("profile_id", profileId);
    if (error) throw new Error("Не удалось прочитать роли Discord");

    for (const grant of grants ?? []) {
      const roleId = grant.role_id as string;
      try {
        await discord.removeRole(profile.discord_id, roleId);
      } catch (cause) {
        if (!(cause instanceof DiscordError && cause.notFound))
          throw new Error(
            "Discord не подтвердил снятие роли. Попробуйте отвязать позже",
          );
      }
      await writeClient()
        .from("discord_role_grants")
        .delete()
        .eq("profile_id", profileId)
        .eq("role_id", roleId);
    }
  }

  const { error: clearError } = await writeClient()
    .from("player_profiles")
    .update({
      discord_id: null,
      discord_username: null,
      discord_linked_at: null,
      discord_token_enc: null,
      discord_refresh_enc: null,
      discord_token_expires_at: null,
      discord_in_guild: false,
    })
    .eq("id", profileId);
  if (clearError) throw new Error("Не удалось отвязать Discord");

  await audit({ action: "discord.unlink", entity: "player_profile" });
}

/** Admin/captain retry: sync every open team plus the captain role. */
export async function syncAllTeams(): Promise<number> {
  if (!discordConfigured()) return 0;
  const { data, error } = await writeClient()
    .from("community_teams")
    .select("id,archived");
  if (error) throw new Error("Не удалось загрузить команды");
  for (const team of data ?? []) await syncTeam(team.id as number);
  return (data ?? []).length;
}
