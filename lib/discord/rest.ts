import "server-only";

import { discordConfig } from "@/lib/discord/config";

/**
 * Minimal Discord REST client.
 *
 * - one bot token, no SDK;
 * - 6 s timeout, one retry on 5xx, up to two retries on 429 with `retry_after`;
 * - errors are `DiscordError` so callers can tell "channel was deleted" (404)
 *   from "the bot lacks a permission" (403) without parsing strings.
 */
const API = "https://discord.com/api/v10";
const TIMEOUT_MS = 6000;

export class DiscordError extends Error {
  readonly status: number;
  readonly code: number | null;

  constructor(message: string, status: number, code: number | null = null) {
    super(message);
    this.name = "DiscordError";
    this.status = status;
    this.code = code;
  }

  get notFound(): boolean {
    return this.status === 404;
  }

  get forbidden(): boolean {
    return this.status === 403;
  }
}

type Call = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** OAuth token instead of the bot token. */
  bearer?: string;
};

type ErrorBody = { message?: string; code?: number; retry_after?: number };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function call<T>(path: string, options: Call = {}): Promise<T> {
  const token = options.bearer ?? `Bot ${discordConfig().botToken}`;
  let attempt = 0;
  let serverRetry = false;

  for (;;) {
    const response = await fetch(`${API}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Authorization: token,
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (response.status === 429 && attempt < 2) {
      const payload = (await response.json().catch(() => null)) as ErrorBody | null;
      // `retry_after` is in seconds and may be fractional.
      await sleep(Math.min(Math.ceil((payload?.retry_after ?? 1) * 1000), 5000));
      attempt += 1;
      continue;
    }

    if (response.status >= 500 && !serverRetry) {
      serverRetry = true;
      await sleep(400);
      continue;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as ErrorBody | null;
      throw new DiscordError(
        payload?.message ?? `Discord request failed with ${response.status}`,
        response.status,
        payload?.code ?? null,
      );
    }

    if (response.status === 204) return undefined as T;
    return (await response.json().catch(() => ({}))) as T;
  }
}

export type DiscordRole = {
  id: string;
  name: string;
  position: number;
  permissions: string;
  managed: boolean;
};

export type DiscordChannel = {
  id: string;
  name: string;
  type: number;
  parent_id: string | null;
};

export type DiscordMember = {
  roles: string[];
  user?: { id: string; username: string };
};

export const discord = {
  guild: () => call<{ id: string; name: string }>(`/guilds/${discordConfig().guildId}`),

  roles: () => call<DiscordRole[]>(`/guilds/${discordConfig().guildId}/roles`),

  channels: () => call<DiscordChannel[]>(`/guilds/${discordConfig().guildId}/channels`),

  role: (roleId: string) =>
    call<DiscordRole>(`/guilds/${discordConfig().guildId}/roles/${roleId}`),

  createRole: (payload: {
    name: string;
    color: number;
    permissions?: string;
    mentionable?: boolean;
    hoist?: boolean;
  }) =>
    call<DiscordRole>(`/guilds/${discordConfig().guildId}/roles`, {
      method: "POST",
      body: { permissions: "0", mentionable: false, hoist: false, ...payload },
    }),

  modifyRole: (roleId: string, payload: { name?: string; color?: number }) =>
    call<DiscordRole>(`/guilds/${discordConfig().guildId}/roles/${roleId}`, {
      method: "PATCH",
      body: payload,
    }),

  deleteRole: (roleId: string) =>
    call<void>(`/guilds/${discordConfig().guildId}/roles/${roleId}`, {
      method: "DELETE",
    }),

  channel: (channelId: string) => call<DiscordChannel>(`/channels/${channelId}`),

  createChannel: (payload: {
    name: string;
    type: 2;
    parent_id?: string | null;
    permission_overwrites: unknown[];
  }) =>
    call<DiscordChannel>(`/guilds/${discordConfig().guildId}/channels`, {
      method: "POST",
      body: payload,
    }),

  modifyChannel: (
    channelId: string,
    payload: {
      name?: string;
      parent_id?: string | null;
      permission_overwrites?: unknown[];
    },
  ) =>
    call<DiscordChannel>(`/channels/${channelId}`, {
      method: "PATCH",
      body: payload,
    }),

  deleteChannel: (channelId: string) =>
    call<void>(`/channels/${channelId}`, { method: "DELETE" }),

  member: (userId: string) =>
    call<DiscordMember>(`/guilds/${discordConfig().guildId}/members/${userId}`),

  /** `guilds.join`: the player agreed to be added, the bot supplies the token. */
  addMember: (userId: string, accessToken: string) =>
    call<void>(`/guilds/${discordConfig().guildId}/members/${userId}`, {
      method: "PUT",
      body: { access_token: accessToken },
    }),

  addRole: (userId: string, roleId: string) =>
    call<void>(`/guilds/${discordConfig().guildId}/members/${userId}/roles/${roleId}`, {
      method: "PUT",
    }),

  removeRole: (userId: string, roleId: string) =>
    call<void>(`/guilds/${discordConfig().guildId}/members/${userId}/roles/${roleId}`, {
      method: "DELETE",
    }),
};
