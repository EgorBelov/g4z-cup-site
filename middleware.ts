import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE_NAME = "g4z_admin_auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginPage = pathname === "/admin/login";

  if (!isAdminRoute) {
    return NextResponse.next();
  }

  if (isLoginPage) {
    return NextResponse.next();
  }

  const adminCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

  if (adminCookie === "authorized") {
    return NextResponse.next();
  }

  const loginUrl = new URL("/admin/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};