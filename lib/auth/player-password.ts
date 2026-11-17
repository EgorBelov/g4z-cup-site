import "server-only";
import { createHash } from "node:crypto";

export function normalizeLoginNickname(nickname: string): string {
  return nickname.trim().normalize("NFC").toLowerCase();
}

/** Internal Auth identifier only; no mailbox or email delivery is used. */
export function playerPasswordEmail(nickname: string): string {
  const hash = createHash("sha256")
    .update(normalizeLoginNickname(nickname))
    .digest("hex");
  return `${hash}@password.g4z-cup.invalid`;
}
