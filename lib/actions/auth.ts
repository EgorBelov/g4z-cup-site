"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminPasswordHash, authSecret } from "@/lib/env";
import { verifyPassword } from "@/lib/auth/password";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
} from "@/lib/auth/session";
import {
  checkLoginRate,
  recordLoginAttempt,
  resetLoginFailures,
} from "@/lib/auth/rate-limit";
import { requestIp } from "@/lib/auth/guard";
import { audit } from "@/lib/audit";
import { fail, parseForm, type ActionState } from "@/lib/actions/state";
import { loginSchema } from "@/lib/validation/schemas";

export async function loginAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(loginSchema, formData);
  if (parsed.state) return parsed.state;

  const ip = await requestIp();
  const rate = await checkLoginRate(ip);

  if (rate.blocked) {
    return fail(
      `Слишком много попыток. Попробуйте снова через ${rate.retryAfterMinutes} минут.`,
    );
  }

  const valid = await verifyPassword(parsed.data.password, adminPasswordHash());

  await recordLoginAttempt(ip, valid);

  if (!valid) {
    const left = Math.max(0, rate.remaining - 1);
    await audit({
      action: "login.failed",
      entity: "session",
      summary: `Неудачная попытка входа, осталось попыток: ${left}`,
    });

    return fail(
      left > 0
        ? `Неверный пароль. Осталось попыток: ${left}.`
        : "Неверный пароль. Вход заблокирован на 15 минут.",
    );
  }

  await resetLoginFailures(ip);

  const token = await createSessionToken(authSecret());
  const store = await cookies();

  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  await audit({
    action: "login.success",
    entity: "session",
    summary: "Вход в админку",
  });

  const target = parsed.data.redirectTo;
  redirect(target && target.startsWith("/admin") ? target : "/admin");
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/admin/login");
}
