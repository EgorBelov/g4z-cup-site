import { AdminShell } from "@/components/admin/AdminShell";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/ui/Form";
import { Icon } from "@/components/ui/Icon";
import { requireAdmin } from "@/lib/auth/guard";
import { telegramIdentity } from "@/lib/auth/telegram";
import { sessionClient } from "@/lib/supabase/session";
import {
  startTelegramProbeAction,
  signOutTelegramProbeAction,
} from "@/lib/actions/telegram-probe";

const messages: Record<string, string> = {
  success: "Telegram-вход завершён. Сессия проверена сервером Supabase Auth.",
  logout: "Тестовая сессия Telegram завершена. Можно проверить повторный вход.",
  "logout-error": "Не удалось завершить сессию. Попробуйте ещё раз.",
  origin:
    "Адрес этой страницы отличается от NEXT_PUBLIC_SITE_URL. Откройте проверку по настроенному адресу или обновите конфигурацию Auth.",
  start: "Не удалось начать вход. Проверьте настройку провайдера Telegram.",
  admin: "Для проверки требуется действующая сессия организатора.",
  provider:
    "Telegram или Supabase вернули ошибку. Проверьте Redirect URLs и реквизиты провайдера, затем повторите вход.",
  "missing-code":
    "В адресе возврата нет единственного кода авторизации. Начните вход кнопкой ниже.",
  exchange:
    "Код устарел, уже использован или открыт в другом браузере. Начните вход заново в этой вкладке.",
  identity:
    "Сессия получена, но подтверждённая Telegram-идентичность не найдена. Проверка не пройдена.",
};

export default async function TelegramProbePage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  await requireAdmin();
  const { result } = await searchParams;
  const message =
    typeof result === "string" && Object.hasOwn(messages, result)
      ? messages[result]
      : null;
  const client = await sessionClient();
  const { data, error } = await client.auth.getUser();
  const user = error ? null : data.user;
  const identity = telegramIdentity(user);
  const rows =
    identity && user
      ? [
          ["Supabase Auth ID", user.id],
          ["Telegram subject", identity.subject],
          [
            "Контакт из Telegram",
            identity.username ? `@${identity.username}` : "Не передан",
          ],
          [
            "Email",
            user.email ? "Есть в Auth-аккаунте" : "Не запрошен, вход без email",
          ],
        ]
      : [];

  return (
    <AdminShell
      title="Проверка Telegram"
      subtitle="Закрытая проверка входа перед запуском регистрации игроков. Тестовый вход создаёт Auth-аккаунт, но ещё не создаёт профиль игрока."
      actions={
        <ButtonLink href="/admin" variant="secondary">
          К турнирам
        </ButtonLink>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-5 sm:p-7">
          <div className="flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-card bg-accent-soft text-accent">
              <Icon name="telegram" className="size-7" />
            </span>
            <div>
              <p className="eyebrow">Telegram → Supabase → G4Z CUP</p>
              <h2 className="mt-2 text-xl">
                {identity ? "Сессия подтверждена" : "Готово к проверке"}
              </h2>
            </div>
          </div>
          {message ? (
            <p
              role="status"
              className="mt-5 rounded-control border border-edge bg-panel p-4 text-sm"
            >
              {result === "success" && !identity
                ? "Подтверждённая сессия не найдена. Начните вход заново."
                : message}
            </p>
          ) : null}
          {rows.length ? (
            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              {rows.map(([label, value]) => (
                <div key={label} className="rounded-control border border-edge p-4">
                  <dt className="text-xs text-ink-muted">{label}</dt>
                  <dd className="mt-2 break-all text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-5 text-sm text-ink-muted">
              Подтвердите вход своим Telegram-аккаунтом. Телефон и разрешение на
              сообщения не запрашиваются.
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <form action={startTelegramProbeAction}>
              <SubmitButton pendingLabel="Открываем Telegram…">
                <Icon name="telegram" />
                {identity ? "Повторить вход" : "Войти через Telegram"}
              </SubmitButton>
            </form>
            {identity ? (
              <form action={signOutTelegramProbeAction}>
                <SubmitButton variant="secondary" pendingLabel="Выходим…">
                  Выйти из Telegram-сессии
                </SubmitButton>
              </form>
            ) : null}
          </div>
        </Card>
        <Card className="p-5 sm:p-7">
          <h2 className="text-xl">Что проверить</h2>
          <ol className="mt-5 list-decimal space-y-4 pl-5 text-sm leading-relaxed text-ink-muted">
            <li>
              Войдите и убедитесь, что появилась подтверждённая сессия и Telegram
              subject.
            </li>
            <li>Обновите страницу — сессия должна сохраниться.</li>
            <li>
              Запомните Supabase Auth ID. Выйдите из Telegram-сессии на этой странице и
              войдите тем же аккаунтом: ID должен остаться прежним.
            </li>
          </ol>
          <p className="mt-6 border-t border-edge pt-5 text-sm text-ink-muted">
            Тестовая сессия Telegram и вход организатора независимы. Токены и секреты на
            этой странице не отображаются.
          </p>
        </Card>
      </div>
    </AdminShell>
  );
}
