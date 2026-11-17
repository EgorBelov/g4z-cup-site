import { AccountPageBoundary } from "@/components/player/AccountPageBoundary";
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
type PlayerLoginPageProps = {
  searchParams: Promise<{ next?: string; notice?: string }>;
};

export default function PlayerLoginPage(props: PlayerLoginPageProps) {
  return (
    <AccountPageBoundary>
      <PlayerLoginPageContent {...props} />
    </AccountPageBoundary>
  );
}

async function PlayerLoginPageContent({ searchParams }: PlayerLoginPageProps) {
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
          Один аккаунт на игрока: состав, заявки и история турниров. Войдите способом,
          который выбрали при регистрации.
        </p>
      </section>

      <section className="orbit-auth-card orbit-frame">
        <h2>Вход</h2>
        <p className="lead">
          Используйте свой Telegram-аккаунт или первоначальный ник и пароль.
        </p>

        {params.notice ? (
          <p role="status" className="orbit-auth-note">
            {params.notice === "created" ? (
              "Аккаунт создан. Войдите по нику и паролю."
            ) : (
              <>
                Подтверждение входа не завершилось. Повторите его в том же браузере, где
                открыли сайт. После перехода в Telegram дождитесь возврата по кнопке
                авторизации.
              </>
            )}
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
