import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { profileSchema } from "@/lib/validation/schemas";
import { safePlayerReturn } from "@/lib/validation/profile";

export const AUTH_FLOW_COOKIE = "g4z_auth_flow";
export const AUTH_FLOW_TTL = 30 * 60;
const schema = z.object({
  purpose: z.enum(["register", "login", "probe"]),
  origin: z.url(),
  next: z.string().transform(safePlayerReturn),
  profile: profileSchema.nullable(),
  expires: z.number().int(),
});
export type AuthFlow = z.infer<typeof schema>;
type Input = Omit<AuthFlow, "expires">;
const aad = Buffer.from("g4z.auth.flow.v1");
function key(secret: string) {
  return createHash("sha256").update(aad).update(secret).digest();
}

export function sealAuthFlow(input: Input, secret: string, now = Date.now()): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  cipher.setAAD(aad);
  const body = Buffer.from(
    JSON.stringify({ ...input, expires: now + AUTH_FLOW_TTL * 1000 }),
  );
  if (body.length > 2700) throw new Error("Данные регистрации слишком длинные");
  const encrypted = Buffer.concat([cipher.update(body), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}
export function openAuthFlow(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): AuthFlow | null {
  if (!token || token.length > 3800 || !/^[A-Za-z0-9_-]+$/.test(token)) return null;
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
      result.data.expires <= now + AUTH_FLOW_TTL * 1000
      ? result.data
      : null;
  } catch {
    return null;
  }
}
