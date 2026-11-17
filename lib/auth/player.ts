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
export async function verifiedPlayerSession(canSetCookies = false) {
  const client = await sessionClient(canSetCookies);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user || data.user.is_anonymous) return null;
  return { user: data.user, identity: telegramIdentity(data.user) };
}
export async function assertPlayerSession() {
  const session = await verifiedPlayerSession(true);
  if (!session) redirect("/login?notice=session");
  return session;
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
  // Mobile carriers put thousands of players behind one CGNAT address, so a
  // tight per-IP limit locks out a whole network instead of one abuser.
  await consumeRate(`auth:${key}`, 60, 900);
  return origin;
}
export async function assertPlayer() {
  const session = await assertPlayerSession();
  const { data, error } = await writeClient()
    .from("player_profiles")
    .select(
      "id,code,telegram_id,login_nickname,nickname,telegram_username,telegram_contact_verified,steam_url,faceit_url,dotabuff_url,version,discord_id,discord_username,discord_linked_at,discord_in_guild",
    )
    .eq("id", session.user.id)
    .maybeSingle();
  if (error) throw new Error("Не удалось загрузить профиль");
  if (!data) redirect("/register?notice=profile");
  await consumeRate(`player:${session.user.id}`, 60, 60);
  return { ...session, profile: data as Profile };
}
