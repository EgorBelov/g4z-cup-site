import "server-only";

import { discordConfig } from "@/lib/discord/config";
import { DiscordError } from "@/lib/discord/rest";

/** OAuth2 with `identify guilds.join`: who is this, and may we add them. */
const AUTHORIZE = "https://discord.com/oauth2/authorize";
const TOKEN = "https://discord.com/api/v10/oauth2/token";
const ME = "https://discord.com/api/v10/users/@me";

export type DiscordTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
};

export type DiscordUser = {
  id: string;
  username: string;
  global_name: string | null;
};

export function authorizeUrl(input: { state: string; redirectUri: string }): string {
  const url = new URL(AUTHORIZE);
  url.searchParams.set("client_id", discordConfig().clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("scope", "identify guilds.join");
  url.searchParams.set("state", input.state);
  // Without this Discord silently reuses the previous grant, which confuses
  // people who link a second account.
  url.searchParams.set("prompt", "consent");
  return url.toString();
}

async function requestToken(body: URLSearchParams): Promise<DiscordTokens> {
  const response = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const payload = (await response.json().catch(() => null)) as
    | (Partial<DiscordTokens> & { error?: string; error_description?: string })
    | null;
  if (!response.ok || !payload?.access_token) {
    throw new DiscordError(
      payload?.error_description ?? payload?.error ?? "Discord token exchange failed",
      response.status,
    );
  }
  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token ?? "",
    expires_in: payload.expires_in ?? 0,
    token_type: payload.token_type ?? "Bearer",
    scope: payload.scope ?? "",
  };
}

export function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<DiscordTokens> {
  const { clientId, clientSecret } = discordConfig();
  return requestToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  );
}

export function refreshTokens(refreshToken: string): Promise<DiscordTokens> {
  const { clientId, clientSecret } = discordConfig();
  return requestToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  );
}

export async function oauthUser(accessToken: string): Promise<DiscordUser> {
  const response = await fetch(ME, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) {
    throw new DiscordError("Discord did not confirm the account", response.status);
  }
  const user = (await response.json()) as DiscordUser;
  if (!/^[0-9]{17,20}$/.test(user.id)) {
    throw new DiscordError("Discord returned an unexpected account id", 400);
  }
  return user;
}
