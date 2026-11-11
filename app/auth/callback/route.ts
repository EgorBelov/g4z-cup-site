import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { isAdmin } from "@/lib/auth/guard";
import { telegramIdentity, TELEGRAM_PROBE_PATH } from "@/lib/auth/telegram";
import { siteUrl, authSecret } from "@/lib/env";
import { AUTH_FLOW_COOKIE, openAuthFlow } from "@/lib/auth/flow";
import { allowedAuthOrigin } from "@/lib/auth/origin";
import { sessionClient } from "@/lib/supabase/session";

export async function GET(request: NextRequest) {
  const flow = openAuthFlow(
    (await cookies()).get(AUTH_FLOW_COOKIE)?.value,
    authSecret(),
  );
  const origin =
    flow && allowedAuthOrigin(flow.origin)
      ? flow.origin
      : allowedAuthOrigin(request.nextUrl.origin)
        ? request.nextUrl.origin
        : new URL(siteUrl()).origin;
  const probe = flow?.purpose === "probe";
  function finish(result: string) {
    const path = probe
      ? `${TELEGRAM_PROBE_PATH}?result=${result}`
      : result === "success"
        ? "/auth/complete"
        : `${flow?.purpose === "register" ? "/register" : "/login"}?notice=${result}`;
    const response = NextResponse.redirect(new URL(path, origin), 303);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
  if (!flow || !allowedAuthOrigin(flow.origin)) return finish("expired");
  if (probe && !(await isAdmin())) return finish("admin");
  const params = request.nextUrl.searchParams;
  if (params.has("error")) return finish("provider");
  const codes = params.getAll("code");
  if (codes.length !== 1 || !codes[0] || codes[0].length > 2048) {
    return finish("missing-code");
  }

  const client = await sessionClient(true);
  // The SDK binds this exchange to this browser's HttpOnly PKCE verifier.
  const { error } = await client.auth.exchangeCodeForSession(codes[0]);
  if (error) return finish("exchange");
  const { data, error: userError } = await client.auth.getUser();
  if (userError || !telegramIdentity(data.user)) {
    await client.auth.signOut({ scope: "local" });
    return finish("identity");
  }
  return finish("success");
}
