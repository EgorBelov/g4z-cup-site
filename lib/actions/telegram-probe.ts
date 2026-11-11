"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/auth/guard";
import { TELEGRAM_PROBE_PATH, TELEGRAM_PROVIDER } from "@/lib/auth/telegram";
import { sessionClient } from "@/lib/supabase/session";
import { siteUrl } from "@/lib/env";

/** Organiser-only compatibility check, not the player registration action. */
export async function startTelegramProbeAction() {
  await assertAdmin();
  const origin = (await headers()).get("origin");
  if (origin !== new URL(siteUrl()).origin) {
    redirect(`${TELEGRAM_PROBE_PATH}?result=origin`);
  }
  const client = await sessionClient(true);
  const { data, error } = await client.auth.signInWithOAuth({
    provider: TELEGRAM_PROVIDER,
    options: {
      redirectTo: `${siteUrl()}/auth/callback`,
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
