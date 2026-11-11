import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { refreshSession } from "@/lib/supabase/refresh-session";

/**
 * Proxy (formerly middleware — renamed in Next.js 16).
 * node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md
 *
 * This is the optimistic gate that keeps unauthenticated browsers out of the
 * admin UI. It is not the authorisation boundary: every server action calls
 * `assertAdmin()` itself, because actions are reachable by direct POST.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!pathname.startsWith("/admin")) return refreshSession(request);

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  const authorised = secret ? await verifySessionToken(token, secret) : false;

  if (authorised) {
    if (pathname === "/admin/telegram") return refreshSession(request);
    return NextResponse.next();
  }

  const loginUrl = new URL("/admin/login", request.url);
  if (pathname !== "/admin") {
    loginUrl.searchParams.set("next", `${pathname}${search}`);
  }

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/me",
    "/me/:path*",
    "/login",
    "/register",
    "/auth/complete",
    "/invite/:path*",
    "/t/:slug/register",
  ],
};
