import "server-only";
import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { sessionClient } from "@/lib/supabase/session";
import { writeClient } from "@/lib/supabase/write";
import { telegramIdentity } from "@/lib/auth/telegram";
import { authRequestOrigin } from "@/lib/auth/origin";
import { requestIp } from "@/lib/auth/guard";
import { authSecret } from "@/lib/env";
import type { Profile } from "@/lib/types/registration";

export async function verifiedTelegramSession(canSetCookies = false) {
  const client = await sessionClient(canSetCookies);
  const { data, error } = await client.auth.getUser();
  const identity = error ? null : telegramIdentity(data.user);
  return identity && data.user ? { user: data.user, identity } : null;
}
export async function assertTelegramSession() {
  const session = await verifiedTelegramSession(true);
  if (!session) redirect("/login?notice=session");
  return session;
}
async function consumeRate(key: string, limit: number, window: number) {
  const { data, error } = await writeClient().rpc("registration_throttle", {
    p_key: key,
    p_limit: limit,
    p_window: window,
  });
  if (error) throw new Error("Не удалось проверить лимит действий. Попробуйте позже");
  if (data !== true)
    throw new Error("Слишком много действий. Подождите несколько минут");
}
export async function assertAuthEntry() {
  const origin = await authRequestOrigin();
  const ip = await requestIp();
  const key = createHash("sha256").update(authSecret()).update(ip).digest("hex");
  await consumeRate(`auth:${key}`, 20, 900);
  return origin;
}
export async function assertPlayer() {
  const session = await assertTelegramSession();
  const { data, error } = await writeClient()
    .from("player_profiles")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();
  if (error) throw new Error("Не удалось загрузить профиль");
  if (!data) redirect("/register?notice=profile");
  await consumeRate(`player:${session.user.id}`, 60, 60);
  return { ...session, profile: data as Profile };
}
