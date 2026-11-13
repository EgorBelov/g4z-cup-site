import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/player/AccountForms";
import { authSecret } from "@/lib/env";
import { AUTH_FLOW_COOKIE, openAuthFlow } from "@/lib/auth/flow";
import { verifiedTelegramSession } from "@/lib/auth/player";
import { currentPlayer } from "@/lib/queries/player";
import { safePlayerReturn } from "@/lib/validation/profile";
export const metadata: Metadata = {
  title: "Создать аккаунт",
  robots: { index: false, follow: false },
};

const flowNotices = ["exchange", "expired", "provider", "missing-code"];

export default async function RegisterPage({
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
  const session = await verifiedTelegramSession();
  const values =
    flow?.purpose === "register" && flow.profile
      ? flow.profile
      : { telegram_username: session?.identity.username ?? "" };

  return (
    <div className="orbit-auth orbit-auth--wide">
      <section className="orbit-auth-side orbit-frame">
        <p className="label">На одной орбите</p>
        <h1>Твой аккаунт. Твоя команда.</h1>
        <p>
          Аккаунт нужен, чтобы собирать состав, принимать приглашения и подавать заявки
          на кубки. Пароль и телефон не понадобятся.
        </p>
        <ol className="orbit-auth-steps">
          <li>
            <b>01</b> Аккаунт
          </li>
          <li>
            <b>02</b> Команда
          </li>
          <li>
            <b>03</b> Турнир
          </li>
        </ol>
      </section>

      <section className="orbit-auth-card orbit-frame">
        <h2>Создать аккаунт</h2>
        <p className="lead">
          Telegram подтверждает аккаунт — отдельного пароля нет. Ник и контакты можно
          поменять позже в профиле.
        </p>

        {params.notice ? (
          <p role="status" className="orbit-auth-note">
            {flowNotices.includes(params.notice)
              ? "Подтверждение не завершилось. Данные формы сохранены в исходном браузере. Повторите вход из него."
              : "Заполните обязательные поля, чтобы завершить регистрацию на сайте."}
          </p>
        ) : null}

        <div className="orbit-form-scope">
          <ProfileForm values={values} next={next} />
        </div>

        <p className="orbit-auth-foot">
          Уже есть аккаунт?{" "}
          <Link prefetch={false} href={`/login?next=${encodeURIComponent(next)}`}>
            Войти
          </Link>
        </p>
      </section>
    </div>
  );
}
