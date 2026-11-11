import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { siteUrl, supabaseAnonKey, supabaseUrl } from "@/lib/env";

// This is a user's Supabase Auth session, separate from the organiser cookie
// and from the stateless public/read and service-role/write clients.
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: new URL(siteUrl()).protocol === "https:",
  path: "/",
};

/** A fresh client per request; never put sessions into a shared cache. */
export async function sessionClient(canSetCookies = false) {
  const store = await cookies();
  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookieOptions: sessionCookieOptions,
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        // Rendering cannot write cookies. The scoped proxy refreshes first.
        if (!canSetCookies) return;
        for (const { name, value, options } of values) {
          store.set(name, value, options);
        }
      },
    },
  });
}
