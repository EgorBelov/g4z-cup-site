import "server-only";

/**
 * Discord configuration.
 *
 * Only the bot token and the OAuth client secret are secrets; all ids are
 * snowflakes. Everything is read lazily so that a missing key turns into one
 * readable error instead of a broken import.
 */
const SNOWFLAKE = /^[0-9]{17,20}$/;

export type DiscordConfig = {
  clientId: string;
  clientSecret: string;
  botToken: string;
  guildId: string;
  teamsCategoryId: string;
  captainRoleId: string;
};

function raw(name: string): string {
  return (process.env[name] ?? "").trim().replace(/^"|"$/g, "");
}

function snowflake(name: string): string {
  const value = raw(name);
  if (!SNOWFLAKE.test(value)) {
    throw new Error(
      `${name} must be a Discord snowflake (17-20 digits), got "${value || "empty"}".`,
    );
  }
  return value;
}

/** Cheap check used before queueing any Discord work. */
export function discordConfigured(): boolean {
  return (
    Boolean(raw("DISCORD_BOT_TOKEN")) &&
    SNOWFLAKE.test(raw("DISCORD_GUILD_ID")) &&
    SNOWFLAKE.test(raw("DISCORD_CLIENT_ID")) &&
    Boolean(raw("DISCORD_CLIENT_SECRET"))
  );
}

export function discordConfig(): DiscordConfig {
  const config = {
    clientId: snowflake("DISCORD_CLIENT_ID"),
    clientSecret: raw("DISCORD_CLIENT_SECRET"),
    botToken: raw("DISCORD_BOT_TOKEN"),
    guildId: snowflake("DISCORD_GUILD_ID"),
    teamsCategoryId: snowflake("DISCORD_TEAMS_CATEGORY_ID"),
    captainRoleId: snowflake("DISCORD_ROLE_CAPTAIN_ID"),
  };
  if (!config.clientSecret || !config.botToken)
    throw new Error("Discord credentials are not configured");
  return config;
}

/** The OAuth callback URL must match one registered in the Discord app. */
export function discordRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/auth/discord/callback`;
}

/**
 * Channel deep link, or null when Discord is not configured.
 *
 * A broken or half-filled configuration must not take a whole cabinet page
 * down: the link simply disappears.
 */
export function discordChannelUrl(channelId: string | null | undefined): string | null {
  if (!channelId) return null;
  try {
    const { guildId } = discordConfig();
    return `https://discord.com/channels/${guildId}/${channelId}`;
  } catch {
    return null;
  }
}
