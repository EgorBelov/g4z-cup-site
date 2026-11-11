"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/auth/guard";
import { TELEGRAM_PROBE_PATH, TELEGRAM_PROVIDER } from "@/lib/auth/telegram";
import { sessionClient } from "@/lib/supabase/session";
import { authSecret } from "@/lib/env";
import { authRequestOrigin } from "@/lib/auth/origin";
import { AUTH_FLOW_COOKIE, AUTH_FLOW_TTL, sealAuthFlow } from "@/lib/auth/flow";
import { sessionCookieOptions } from "@/lib/supabase/session";

/** Organiser-only compatibility check, not the player registration action. */
export async function startTelegramProbeAction() {
  await assertAdmin();
  const origin = await authRequestOrigin();
  (await cookies()).set(
    AUTH_FLOW_COOKIE,
    sealAuthFlow(
      { purpose: "probe", origin, next: "/me", profile: null },
      authSecret(),
    ),
    { ...sessionCookieOptions, maxAge: AUTH_FLOW_TTL },
  );
  const client = await sessionClient(true);
  const { data, error } = await client.auth.signInWithOAuth({
    provider: TELEGRAM_PROVIDER,
    options: {
      redirectTo: `${origin}/auth/callback`,
      skipBrowserRedirect: true,
    },
  });
  if (error || !data.url) redirect(`${TELEGRAM_PROBE_PATH}?result=start`);
  redirect(data.url);
}

export async function signOutTelegramProbeAction() {
  await assertAdmin();
  const client = await sessionClient(true);
  const { error } = await client.auth.signOut({ scope: "local" });
  redirect(`${TELEGRAM_PROBE_PATH}?result=${error ? "logout-error" : "logout"}`);
}
