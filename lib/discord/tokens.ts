import "server-only";

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { authSecret } from "@/lib/env";

/**
 * Discord OAuth tokens stay encrypted at rest: an access token can add the
 * player to the server, so a database dump alone must not be enough to use it.
 *
 * The key is derived from AUTH_SECRET with HKDF, so there is no extra secret to
 * rotate: rotating AUTH_SECRET simply invalidates stored tokens and players
 * relink.
 */
const AAD = Buffer.from("g4z.discord.tokens.v1");
const SALT = Buffer.from("g4z.discord");

function key(secret: string): Buffer {
  return Buffer.from(hkdfSync("sha256", Buffer.from(secret, "utf8"), SALT, AAD, 32));
}

/** `iv | tag | ciphertext`, base64url. */
export function sealToken(value: string, secret = authSecret()): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  cipher.setAAD(AAD);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

/** Returns null for anything that does not decrypt: missing, tampered, rotated. */
export function openToken(
  value: string | null | undefined,
  secret = authSecret(),
): string | null {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const raw = Buffer.from(value, "base64url");
    if (raw.length < 29) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(secret), raw.subarray(0, 12));
    decipher.setAAD(AAD);
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([
      decipher.update(raw.subarray(28)),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
