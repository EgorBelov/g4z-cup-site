"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_COOKIE_NAME = "g4z_admin_auth";

export async function adminLoginAction(formData: FormData) {
  const password = String(formData.get("password") || "").trim();
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedPassword) {
    throw new Error("ADMIN_PASSWORD не задан в .env.local");
  }

  if (password !== expectedPassword) {
    redirect("/admin/login?error=1");
  }

  const cookieStore = await cookies();

  cookieStore.set(ADMIN_COOKIE_NAME, "authorized", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/admin");
}

export async function adminLogoutAction() {
  const cookieStore = await cookies();

  cookieStore.delete(ADMIN_COOKIE_NAME);

  redirect("/admin/login");
}