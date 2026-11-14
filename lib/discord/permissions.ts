/**
 * Permission bits and channel overwrites for team voice channels.
 *
 * Kept free of `server-only` and of any I/O: these are the rules from the plan
 * and they are covered by unit tests.
 */
export const PERMISSION = {
  CREATE_INSTANT_INVITE: 1n,
  MANAGE_CHANNELS: 16n,
  VIEW_CHANNEL: 1024n,
  CONNECT: 1048576n,
  SPEAK: 2097152n,
  MANAGE_ROLES: 268435456n,
} as const;

/** Grants the bot needs: assign roles, create channels, see them, invite users. */
export const BOT_PERMISSIONS = (
  PERMISSION.CREATE_INSTANT_INVITE |
  PERMISSION.MANAGE_CHANNELS |
  PERMISSION.VIEW_CHANNEL |
  PERMISSION.MANAGE_ROLES
).toString();

/** View + join + speak, used for both the team role and the captain role. */
export const VOICE_ALLOW = (
  PERMISSION.VIEW_CHANNEL |
  PERMISSION.CONNECT |
  PERMISSION.SPEAK
).toString();

/** Site accent (`--color-accent`), so roles look like the rest of G4Z CUP. */
export const ROLE_COLOR = 0xd0df97;

export type ChannelOverwrite = {
  id: string;
  type: 0;
  allow: string;
  deny: string;
};

/**
 * `@everyone` sees the channel but cannot join it. Role overwrites take
 * precedence over the `@everyone` one in Discord's resolution order, so the
 * team and the captain role still get in.
 */
export function teamChannelOverwrites(input: {
  guildId: string;
  teamRoleId: string;
  captainRoleId: string;
}): ChannelOverwrite[] {
  return [
    {
      id: input.guildId,
      type: 0,
      allow: PERMISSION.VIEW_CHANNEL.toString(),
      deny: PERMISSION.CONNECT.toString(),
    },
    { id: input.teamRoleId, type: 0, allow: VOICE_ALLOW, deny: "0" },
    { id: input.captainRoleId, type: 0, allow: VOICE_ALLOW, deny: "0" },
  ];
}

/**
 * Discord caps names at 100 characters and rejects control characters. Leading
 * or trailing spaces are not allowed either.
 */
export function sanitizeName(raw: string, fallback = "Команда"): string {
  const cleaned = raw
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100)
    .trim();
  return cleaned || fallback;
}
