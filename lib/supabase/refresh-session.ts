import "server-only";

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";
import { sessionCookieOptions } from "@/lib/supabase/session";

/** Only called for the private Telegram check, after the admin gate. */
export async function refreshSession(request: NextRequest) {
  let response = NextResponse.next();
  const client = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookieOptions: sessionCookieOptions,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, headers) {
        for (const { name, value } of values) request.cookies.set(name, value);
        response = NextResponse.next({ request: { headers: request.headers } });
        for (const { name, value, options } of values) {
          response.cookies.set(name, value, options);
        }
        for (const [name, value] of Object.entries(headers)) {
          response.headers.set(name, value);
        }
      },
    },
  });
  // getSession() alone does not authenticate a cookie. getUser also detects
  // revoked sessions and supplies fresh provider identity data for the check.
  await client.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
