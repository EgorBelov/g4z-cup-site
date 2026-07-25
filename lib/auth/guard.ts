import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { authSecret } from "@/lib/env";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

/**
 * Session check for admin pages and server actions.
 *
 * proxy.ts already blocks unauthenticated navigation, but server actions are
 * reachable by direct POST, so every mutation calls `requireAdmin()` itself.
 * node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md
 */
export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token, authSecret());
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    redirect("/admin/login");
  }
}

/** Same check, but for actions that should fail loudly instead of redirecting. */
export async function assertAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    throw new Error("Требуется вход в админку");
  }
}

/** Client IP for rate limiting and the audit log. */
export async function requestIp(): Promise<string> {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return list.get("x-real-ip") ?? "unknown";
}
