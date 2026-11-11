import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Card } from "@/components/ui/Card";
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
    <Card className="mx-auto max-w-lg p-6 sm:p-9">
      <p className="eyebrow">С возвращением</p>
      <h1 className="page-title mt-3">Войти в G4Z CUP</h1>
      <p className="mt-4 text-sm text-ink-muted">
        Используйте тот Telegram-аккаунт, с которым регистрировались.
      </p>
      {params.notice ? (
        <p
          role="status"
          className="mt-5 rounded-control border border-edge bg-panel p-4 text-sm"
        >
          Подтверждение входа не завершилось. Повторите его в том же браузере, где
          открыли сайт. После перехода в Telegram дождитесь возврата по кнопке
          авторизации.
        </p>
      ) : null}
      <PlayerLoginForm next={next} />
      <p className="mt-6 text-sm text-ink-muted">
        Впервые здесь?{" "}
        <Link
          prefetch={false}
          href={`/register?next=${encodeURIComponent(next)}`}
          className="text-accent underline"
        >
          Создать аккаунт
        </Link>
      </p>
    </Card>
  );
}
