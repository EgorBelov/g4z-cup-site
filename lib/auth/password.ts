import "server-only";

import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { promisify } from "node:util";

// `promisify`'s inferred overload drops the options argument, so type it here.
const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SCRYPT_COST = 1 << 15; // 32768
// 128 * N * r bytes are needed; the Node default of 32 MiB is exactly on the
// edge for this cost, so raise the ceiling explicitly.
const SCRYPT_MAX_MEM = 64 * 1024 * 1024;

/**
 * Password hashing for the shared organiser password.
 *
 * Format: `scrypt$<N>$<saltHex>$<hashHex>`. Verification is constant time, so a
 * wrong password leaks no timing information about how much of it matched.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH, {
    N: SCRYPT_COST,
    maxmem: SCRYPT_MAX_MEM,
  });

  return `scrypt$${SCRYPT_COST}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;

  const cost = Number(parts[1]);
  const saltHex = parts[2];
  const hashHex = parts[3];

  if (!Number.isInteger(cost) || cost < 1024 || !saltHex || !hashHex) {
    return false;
  }

  let expected: Buffer;
  try {
    expected = Buffer.from(hashHex, "hex");
  } catch {
    return false;
  }

  const derived = await scryptAsync(
    password.normalize("NFKC"),
    Buffer.from(saltHex, "hex"),
    expected.length,
    { N: cost, maxmem: SCRYPT_MAX_MEM },
  );

  if (derived.length !== expected.length) return false;

  return timingSafeEqual(derived, expected);
}
