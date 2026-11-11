import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell, tournamentTabs } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { requireAdmin } from "@/lib/auth/guard";
import { adminTournament } from "@/lib/queries/admin";
import { organizerApplications, organizerPlayers } from "@/lib/queries/organizer";
import { applicationLabels } from "@/lib/types/registration";
export default async function TournamentRegistrationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ after?: string }>;
}) {
  await requireAdmin();
  const { slug } = await params;
  const t = await adminTournament(slug);
  if (!t) notFound();
  const raw = (await searchParams).after;
  const after =
    raw && /^\d+$/.test(raw) && Number.isSafeInteger(Number(raw)) ? Number(raw) : 0;
  const [{ applications, teams }, interests] = await Promise.all([
    organizerApplications(t.id),
    organizerPlayers({ tournamentId: t.id, after }),
  ]);
  return (
    <AdminShell
      title="Заявки и желающие"
      subtitle={`${t.name} · ${t.registration_open ? "Приём открыт" : "Приём закрыт"}`}
      tabs={tournamentTabs(slug)}
      activeHref={`/admin/t/${slug}/registrations`}
      publicHref={`/t/${slug}/register`}
      actions={
        <ButtonLink href="/admin/players" variant="secondary" size="sm">
          Все аккаунты
        </ButtonLink>
      }
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Командных заявок", value: applications.length },
          {
            label: "На проверке",
            value: applications.filter((a) => a.status === "submitted").length,
          },
          {
            label: "Принято",
            value: applications.filter((a) => a.status === "accepted").length,
          },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-xs text-ink-muted">{s.label}</p>
            <p className="mt-3 text-3xl">{s.value}</p>
          </Card>
        ))}
      </div>
      <Card className="p-5 sm:p-7">
        <h2 className="mb-5 text-2xl">Командные заявки</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {applications.map((a) => (
            <Link
              key={a.id}
              href={`/admin/t/${slug}/registrations/${a.id}`}
              className="interactive-card rounded-control border border-edge bg-panel p-5"
            >
              <p className="font-medium">
                {teams.find((c) => c.id === a.community_team_id)?.name ?? "Команда"}
              </p>
              <p className="mt-3 text-sm text-accent">{applicationLabels[a.status]}</p>
              {a.reason ? (
                <p className="mt-3 text-sm text-ink-muted">{a.reason}</p>
              ) : null}
            </Link>
          ))}
        </div>
        {!applications.length ? (
          <p className="text-sm text-ink-muted">
            Заявок пока нет. Капитаны смогут подать их после сборки состава.
          </p>
        ) : null}
      </Card>
      <Card className="mt-5 p-5 sm:p-7">
        <h2 className="text-2xl">Хочу участвовать · без команды</h2>
        <p className="mt-3 text-sm text-ink-muted">
          Это пожелания игроков, а не заявки на турнир. Откройте профиль, чтобы
          связаться или добавить игрока в состав напрямую.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {interests.players.map((p) => (
            <Link
              key={p.id}
              href={`/admin/players/${p.id}`}
              className="interactive-card rounded-control border border-edge bg-panel p-4"
            >
              <p className="font-medium">
                {p.nickname} <span className="text-xs text-ink-muted">P{p.code}</span>
              </p>
              <p className="mt-2 text-sm text-ink-muted">@{p.telegram_username}</p>
            </Link>
          ))}
        </div>
        {!interests.players.length ? (
          <p className="mt-5 text-sm text-ink-muted">Пока нет желающих без команды.</p>
        ) : null}
        {interests.next ? (
          <ButtonLink
            href={`/admin/t/${slug}/registrations?after=${interests.next}`}
            className="mt-5"
            variant="secondary"
          >
            Следующие игроки
          </ButtonLink>
        ) : null}
      </Card>
    </AdminShell>
  );
}
