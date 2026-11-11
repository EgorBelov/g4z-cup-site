import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/player/AccountForms";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { authSecret } from "@/lib/env";
import { AUTH_FLOW_COOKIE, openAuthFlow } from "@/lib/auth/flow";
import { verifiedTelegramSession } from "@/lib/auth/player";
import { currentPlayer } from "@/lib/queries/player";
import { safePlayerReturn } from "@/lib/validation/profile";
export const metadata: Metadata = {
  title: "Создать аккаунт",
  robots: { index: false, follow: false },
};
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
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[.75fr_1.25fr]">
      <div>
        <p className="eyebrow">На одной орбите</p>
        <h1 className="page-title mt-3">
          Твой аккаунт.
          <br />
          Твоя команда.
        </h1>
        <p className="mt-5 text-sm leading-relaxed text-ink-muted">
          Создайте аккаунт, чтобы собирать команду, принимать приглашения и участвовать
          в кубках.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {["Аккаунт", "Команда", "Турнир"].map((s, i) => (
            <span
              key={s}
              className="inline-flex items-center gap-2 rounded-pill border border-edge bg-panel px-4 py-2 text-sm"
            >
              <span className="text-accent">0{i + 1}</span>
              {s}
            </span>
          ))}
        </div>
        <p className="mt-6 flex items-start gap-3 text-sm text-ink-muted">
          <Icon name="telegram" />
          Telegram подтверждает аккаунт. Пароль и телефон на сайте не нужны.
        </p>
      </div>
      <Card className="p-5 sm:p-7">
        <h2 className="mb-6 text-xl">Создать аккаунт</h2>
        {params.notice ? (
          <p
            role="status"
            className="mb-5 rounded-control border border-edge bg-panel p-4 text-sm"
          >
            {["exchange", "expired", "provider", "missing-code"].includes(params.notice)
              ? "Подтверждение не завершилось. Данные формы сохранены в исходном браузере. Повторите вход из него."
              : "Заполните обязательные поля, чтобы завершить регистрацию на сайте."}
          </p>
        ) : null}
        <ProfileForm values={values} next={next} />
        <p className="mt-6 text-sm text-ink-muted">
          Уже есть аккаунт?{" "}
          <Link
            prefetch={false}
            href={`/login?next=${encodeURIComponent(next)}`}
            className="text-accent underline"
          >
            Войти
          </Link>
        </p>
      </Card>
    </div>
  );
}
