import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";

/**
 * OAuth `state` is sealed, not merely random: it carries which player started
 * the flow and which origin the callback must return to. A callback for another
 * profile or another domain is rejected.
 */
export const DISCORD_STATE_COOKIE = "g4z_discord_state";
export const DISCORD_STATE_TTL = 10 * 60;

const schema = z.object({
  profile: z.uuid(),
  origin: z.url(),
  next: z.string().max(200),
  nonce: z.string().min(16).max(64),
  expires: z.number().int(),
});

export type DiscordState = z.infer<typeof schema>;

const aad = Buffer.from("g4z.discord.state.v1");

function key(secret: string): Buffer {
  return createHash("sha256").update(aad).update(secret).digest();
}

export function sealDiscordState(
  input: Omit<DiscordState, "expires">,
  secret: string,
  now = Date.now(),
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  cipher.setAAD(aad);
  const body = Buffer.from(
    JSON.stringify({ ...input, expires: now + DISCORD_STATE_TTL * 1000 }),
  );
  const encrypted = Buffer.concat([cipher.update(body), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function openDiscordState(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): DiscordState | null {
  if (!token || token.length > 1200 || !/^[A-Za-z0-9_-]+$/.test(token)) return null;
  try {
    const raw = Buffer.from(token, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key(secret), raw.subarray(0, 12));
    decipher.setAAD(aad);
    decipher.setAuthTag(raw.subarray(12, 28));
    const data = JSON.parse(
      Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString(
        "utf8",
      ),
    );
    const result = schema.safeParse(data);
    return result.success &&
      result.data.expires > now &&
      result.data.expires <= now + DISCORD_STATE_TTL * 1000
      ? result.data
      : null;
  } catch {
    return null;
  }
}

/** Random value that ties the redirect to the cookie that started it. */
export function discordNonce(): string {
  return randomBytes(16).toString("hex");
}
