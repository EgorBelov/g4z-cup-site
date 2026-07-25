/**
 * Admin session cookie.
 *
 * The cookie carries a signed payload, not a magic string: `<payload>.<sig>`
 * where the signature is HMAC-SHA256 over the payload using AUTH_SECRET. A
 * client cannot mint or extend a session without the secret, and an expired
 * payload is rejected even if the signature is valid.
 *
 * Uses Web Crypto so the same code runs in server actions and in proxy.ts.
 */

export const SESSION_COOKIE = "g4z_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

type SessionPayload = {
  /** Issued at, epoch seconds. */
  iat: number;
  /** Expires at, epoch seconds. */
  exp: number;
  /** Random id, so two sessions are never byte-identical. */
  jti: string;
};

function toBase64Url(bytes: Uint8Array<ArrayBufferLike>): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSessionToken(
  secret: string,
  now = Date.now(),
): Promise<string> {
  const issued = Math.floor(now / 1000);
  const payload: SessionPayload = {
    iat: issued,
    exp: issued + SESSION_TTL_SECONDS,
    jti: toBase64Url(crypto.getRandomValues(new Uint8Array(12))),
  };

  const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await key(secret),
    new TextEncoder().encode(encoded),
  );

  return `${encoded}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): Promise<boolean> {
  if (!token) return false;

  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;

  const encoded = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  let valid: boolean;
  try {
    valid = await crypto.subtle.verify(
      "HMAC",
      await key(secret),
      fromBase64Url(signature),
      new TextEncoder().encode(encoded),
    );
  } catch {
    return false;
  }

  if (!valid) return false;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encoded)));
  } catch {
    return false;
  }

  if (typeof payload?.exp !== "number") return false;

  return payload.exp * 1000 > now;
}
