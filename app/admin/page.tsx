import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { TournamentStatusBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/auth/guard";
import { adminTournaments } from "@/lib/queries/admin";
import { setCurrentTournamentAction } from "@/lib/actions/tournaments";
import { formatDateRange } from "@/lib/format/date";

export default async function AdminDashboardPage() {
  await requireAdmin();

  const tournaments = await adminTournaments();
  const current = tournaments.find((tournament) => tournament.is_current);

  return (
    <AdminShell
      title="Турниры"
      subtitle="Текущий кубок выделяется на главной сообщества. Остальные турниры тоже остаются доступны."
      actions={
        <>
          <ButtonLink href="/admin/tournaments/new" size="sm">
            Новый турнир
          </ButtonLink>
          <ButtonLink href="/admin/audit" variant="secondary" size="sm">
            Журнал
          </ButtonLink>
          <ButtonLink href="/admin/telegram" variant="secondary" size="sm">
            Проверка Telegram
          </ButtonLink>
        </>
      }
    >
      {current ? (
        <Card className="mb-6 border-accent/30 bg-accent-soft/40">
          <div className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-accent">
                текущий турнир
              </p>
              <h2 className="mt-1 truncate text-2xl font-normal tracking-tight">
                {current.name}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                {formatDateRange(
                  current.starts_at,
                  current.ends_at,
                  current.time_zone,
                ) ?? "даты не заданы"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink
                href={`/admin/t/${current.slug}/live`}
                variant="live"
                size="sm"
              >
                Ведение матча
              </ButtonLink>
              <ButtonLink
                href={`/admin/t/${current.slug}`}
                variant="secondary"
                size="sm"
              >
                Настройки
              </ButtonLink>
            </div>
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Все турниры" hint={`Всего: ${tournaments.length}`} />
        <div className="p-5">
          {tournaments.length === 0 ? (
            <EmptyState
              title="Турниров пока нет"
              hint="Создайте первый — черновик не виден на сайте, пока вы не смените статус."
              action={
                <ButtonLink href="/admin/tournaments/new">Новый турнир</ButtonLink>
              }
            />
          ) : (
            <ul className="space-y-3">
              {tournaments.map((tournament) => (
                <li
                  key={tournament.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-edge bg-surface-sunken/60 p-4"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/t/${tournament.slug}`}
                      className="truncate font-semibold hover:text-accent"
                    >
                      {tournament.name}
                    </Link>
                    <p className="mt-1 text-xs text-ink-faint">/{tournament.slug}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <TournamentStatusBadge status={tournament.status} />
                    {tournament.is_current ? (
                      <span className="text-xs font-semibold uppercase text-accent">
                        текущий
                      </span>
                    ) : (
                      <form action={setCurrentTournamentAction}>
                        <input
                          type="hidden"
                          name="tournament_id"
                          value={tournament.id}
                        />
                        <button
                          type="submit"
                          className="inline-flex min-h-11 items-center rounded-pill border border-edge px-4 py-2 text-sm text-ink-muted hover:text-ink"
                        >
                          Сделать текущим
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </AdminShell>
  );
}
