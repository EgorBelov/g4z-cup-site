import { notFound } from "next/navigation";
import { AdminShell, tournamentTabs } from "@/components/admin/AdminShell";
import { DangerZone, TournamentForm } from "@/components/admin/TournamentForm";
import { TournamentStatusBadge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/auth/guard";
import {
  adminMatches,
  adminStages,
  adminTeams,
  adminTournament,
} from "@/lib/queries/admin";

type Props = { params: Promise<{ slug: string }> };

export default async function AdminTournamentPage({ params }: Props) {
  await requireAdmin();

  const { slug } = await params;
  const tournament = await adminTournament(slug);
  if (!tournament) notFound();

  const [stages, teams, matches] = await Promise.all([
    adminStages(tournament.id),
    adminTeams(tournament.id),
    adminMatches(tournament.id),
  ]);

  const finished = matches.filter((match) => match.status === "finished").length;
  const live = matches.filter((match) => match.status === "live").length;

  return (
    <AdminShell
      title={tournament.name}
      subtitle={`/t/${tournament.slug}`}
      tabs={tournamentTabs(slug)}
      activeHref={`/admin/t/${slug}`}
      publicHref={`/t/${slug}`}
      actions={<TournamentStatusBadge status={tournament.status} />}
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        {[
          { label: "Этапов", value: stages.length },
          { label: "Команд", value: teams.length },
          { label: "Матчей", value: matches.length },
          {
            label: "Завершено",
            value: `${finished}${live ? ` · ${live} в игре` : ""}`,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-card border border-edge bg-panel p-4"
          >
            <p className="text-xs uppercase tracking-wide text-ink-faint">
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader title="Настройки турнира" />
        <div className="p-5">
          <TournamentForm tournament={tournament} />
        </div>
      </Card>

      <Card className="mt-6 border-live/30">
        <CardHeader
          title="Опасная зона"
          hint="Удаление турнира необратимо и уносит с собой всю его историю"
        />
        <div className="p-5">
          <DangerZone tournament={tournament} />
        </div>
      </Card>
    </AdminShell>
  );
}
