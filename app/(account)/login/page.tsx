import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { PlayerLoginForm } from "@/components/player/AccountForms";
import { currentPlayer } from "@/lib/queries/player";
import { AUTH_FLOW_COOKIE, openAuthFlow } from "@/lib/auth/flow";
import { authSecret } from "@/lib/env";
import { safePlayerReturn } from "@/lib/validation/profile";
export const metadata: Metadata = {
  title: "Вход",
  robots: { index: false, follow: false },
};
export default async function PlayerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const flow = openAuthFlow(
    (await cookies()).get(AUTH_FLOW_COOKIE)?.value,
    authSecret(),
  );
  const next = safePlayerReturn(params.next ?? flow?.next);
  if (await currentPlayer()) redirect(next);

  return (
    <div className="orbit-auth">
      <section className="orbit-auth-side orbit-frame">
        <p className="label">G4Z CUP</p>
        <h1>Снова на орбите.</h1>
        <p>
          Один аккаунт на игрока: состав, заявки и история турниров. Вход — через тот
          Telegram, с которым регистрировались.
        </p>
      </section>

      <section className="orbit-auth-card orbit-frame">
        <h2>Вход</h2>
        <p className="lead">
          Войдите тем же Telegram-аккаунтом, с которым регистрировались. Пароль не нужен
          — подтверждение придёт в Telegram.
        </p>

        {params.notice ? (
          <p role="status" className="orbit-auth-note">
            Подтверждение входа не завершилось. Повторите его в том же браузере, где
            открыли сайт. После перехода в Telegram дождитесь возврата по кнопке
            авторизации.
          </p>
        ) : null}

        <PlayerLoginForm next={next} />

        <p className="orbit-auth-foot">
          Впервые здесь?{" "}
          <Link prefetch={false} href={`/register?next=${encodeURIComponent(next)}`}>
            Создать аккаунт
          </Link>
        </p>
      </section>
    </div>
  );
}
