import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/Card";
import { ButtonLink, buttonClass } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { requireAdmin } from "@/lib/auth/guard";
import { organizerPlayers } from "@/lib/queries/organizer";
export default async function RegisteredPlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; after?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const after =
    params.after &&
    /^\d+$/.test(params.after) &&
    Number.isSafeInteger(Number(params.after))
      ? Number(params.after)
      : 0;
  const { players, next } = await organizerPlayers({ query, after });
  return (
    <AdminShell
      title="Аккаунты игроков"
      subtitle="Контакты и внешние ссылки доступны только организаторам и самому игроку."
      actions={
        <ButtonLink href="/admin" variant="secondary" size="sm">
          К турнирам
        </ButtonLink>
      }
    >
      <form className="mb-6 flex flex-wrap gap-3">
        <Input
          aria-label="Поиск по нику"
          className="max-w-md"
          name="q"
          defaultValue={query}
          maxLength={80}
          placeholder="Поиск по нику"
        />
        <button className={buttonClass("secondary", "sm")} type="submit">
          Найти
        </button>
      </form>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {players.map((p) => (
          <Link
            key={p.id}
            href={`/admin/players/${p.id}`}
            className="interactive-card rounded-card border border-edge bg-panel p-5"
          >
            <p className="font-medium">
              {p.nickname} <span className="text-xs text-ink-muted">P{p.code}</span>
            </p>
            <p className="mt-3 text-sm text-ink-muted">@{p.telegram_username}</p>
          </Link>
        ))}
      </div>
      {!players.length ? (
        <Card className="p-5">
          <p>Игроки не найдены.</p>
        </Card>
      ) : null}
      {next ? (
        <ButtonLink
          href={`/admin/players?after=${next}&q=${encodeURIComponent(query)}`}
          className="mt-6"
          variant="secondary"
        >
          Следующие игроки
        </ButtonLink>
      ) : null}
    </AdminShell>
  );
}
