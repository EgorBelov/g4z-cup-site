"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authSecret } from "@/lib/env";
import {
  assertAuthEntry,
  assertTelegramSession,
  verifiedTelegramSession,
} from "@/lib/auth/player";
import { allowedAuthOrigin } from "@/lib/auth/origin";
import {
  AUTH_FLOW_COOKIE,
  AUTH_FLOW_TTL,
  openAuthFlow,
  sealAuthFlow,
} from "@/lib/auth/flow";
import { sessionClient, sessionCookieOptions } from "@/lib/supabase/session";
import { writeClient } from "@/lib/supabase/write";
import { TELEGRAM_PROVIDER } from "@/lib/auth/telegram";
import { requestIp } from "@/lib/auth/guard";
import { fail, parseForm, type ActionState } from "@/lib/actions/state";
import { playerLoginSchema, registerPlayerSchema } from "@/lib/validation/schemas";

export async function beginRegistrationAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const origin = await assertAuthEntry();
  const parsed = parseForm(registerPlayerSchema, formData);
  if (parsed.state) return parsed.state;
  const { next, ...profile } = parsed.data;
  const store = await cookies();
  store.set(
    AUTH_FLOW_COOKIE,
    sealAuthFlow({ purpose: "register", origin, next, profile }, authSecret()),
    { ...sessionCookieOptions, maxAge: AUTH_FLOW_TTL },
  );
  if (await verifiedTelegramSession(true)) redirect("/auth/complete");
  const client = await sessionClient(true);
  const { data, error } = await client.auth.signInWithOAuth({
    provider: TELEGRAM_PROVIDER,
    options: { redirectTo: `${origin}/auth/callback`, skipBrowserRedirect: true },
  });
  if (error || !data.url)
    return fail("Не удалось открыть Telegram. Попробуйте ещё раз");
  redirect(data.url);
}
export async function beginPlayerLoginAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const origin = await assertAuthEntry();
  const parsed = parseForm(playerLoginSchema, formData);
  if (parsed.state) return parsed.state;
  const store = await cookies();
  store.set(
    AUTH_FLOW_COOKIE,
    sealAuthFlow(
      { purpose: "login", origin, next: parsed.data.next, profile: null },
      authSecret(),
    ),
    { ...sessionCookieOptions, maxAge: AUTH_FLOW_TTL },
  );
  if (await verifiedTelegramSession(true)) redirect("/auth/complete");
  const client = await sessionClient(true);
  const { data, error } = await client.auth.signInWithOAuth({
    provider: TELEGRAM_PROVIDER,
    options: { redirectTo: `${origin}/auth/callback`, skipBrowserRedirect: true },
  });
  if (error || !data.url)
    return fail("Не удалось открыть Telegram. Попробуйте ещё раз");
  redirect(data.url);
}
export async function completePlayerAuthAction(
  _state: ActionState,
): Promise<ActionState> {
  const session = await assertTelegramSession();
  const store = await cookies();
  const flow = openAuthFlow(store.get(AUTH_FLOW_COOKIE)?.value, authSecret());
  if (!flow || !allowedAuthOrigin(flow.origin) || flow.purpose === "probe")
    redirect("/login?notice=expired");
  const client = writeClient();
  if (flow.purpose === "register" && flow.profile) {
    const { error } = await client.rpc("register_player", {
      p_user: session.user.id,
      p_telegram_id: session.identity.subject,
      p_verified_username: session.identity.username,
      p_profile: flow.profile,
      p_ip: await requestIp(),
    });
    if (error)
      return fail(
        error.code === "23505"
          ? "Этот Telegram уже связан с аккаунтом. Попробуйте войти"
          : "Не удалось завершить регистрацию. Попробуйте ещё раз",
      );
  }
  const { data, error } = await client
    .from("player_profiles")
    .select("id")
    .eq("id", session.user.id)
    .maybeSingle();
  if (error) return fail("Не удалось проверить профиль. Попробуйте ещё раз");
  if (!data) redirect(`/register?notice=profile&next=${encodeURIComponent(flow.next)}`);
  store.delete(AUTH_FLOW_COOKIE);
  redirect(flow.next);
}
export async function playerLogoutAction() {
  await assertTelegramSession();
  const client = await sessionClient(true);
  await client.auth.signOut({ scope: "local" });
  (await cookies()).delete(AUTH_FLOW_COOKIE);
  redirect("/login");
}
