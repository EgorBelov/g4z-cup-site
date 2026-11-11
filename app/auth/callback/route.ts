import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth/guard";
import { telegramIdentity, TELEGRAM_PROBE_PATH } from "@/lib/auth/telegram";
import { siteUrl } from "@/lib/env";
import { sessionClient } from "@/lib/supabase/session";

function finish(result: string) {
  // Never forward arbitrary next/redirect_to or upstream error descriptions.
  const response = NextResponse.redirect(
    new URL(`${TELEGRAM_PROBE_PATH}?result=${result}`, siteUrl()),
    303,
  );
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: NextRequest) {
  // Until registration ships, callbacks only serve the closed admin check.
  // Neither a successful Telegram login nor its Supabase session grants admin.
  if (!(await isAdmin())) return finish("admin");
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
