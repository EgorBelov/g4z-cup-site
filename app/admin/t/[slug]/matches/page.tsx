import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell, tournamentTabs } from "@/components/admin/AdminShell";
import { MatchForm, ShiftScheduleForm } from "@/components/admin/MatchForms";
import { MatchStatusBadge } from "@/components/ui/Badge";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/auth/guard";
import {
  adminGroups,
  adminMatches,
  adminStages,
  adminTeams,
  adminTournament,
} from "@/lib/queries/admin";
import { formatDateTime } from "@/lib/format/date";

type Props = { params: Promise<{ slug: string }> };

export default async function AdminMatchesPage({ params }: Props) {
  await requireAdmin();

  const { slug } = await params;
  const tournament = await adminTournament(slug);
  if (!tournament) notFound();

  const [matches, stages, groups, teams] = await Promise.all([
    adminMatches(tournament.id),
    adminStages(tournament.id),
    adminGroups(tournament.id),
    adminTeams(tournament.id),
  ]);

  return (
    <AdminShell
      title="Матчи"
      subtitle={`${tournament.name} · всего ${matches.length}`}
      tabs={tournamentTabs(slug)}
      activeHref={`/admin/t/${slug}/matches`}
      publicHref={`/t/${slug}/schedule`}
    >
      <Card className="mb-6">
        <CardHeader
          title="Сдвинуть расписание"
          hint="Когда турнир поехал по времени — не нужно править каждый матч"
        />
        <div className="p-5">
          <ShiftScheduleForm tournamentId={tournament.id} stages={stages} />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader title="Список матчей" />
          <div className="p-5">
            {matches.length === 0 ? (
              <EmptyState
                title="Матчей нет"
                hint="Проще всего создать их разом на вкладке «Этапы и сетка»."
              />
            ) : (
              <ul className="space-y-2">
                {matches.map((match) => (
                  <li key={match.id}>
                    <Link
                      href={`/admin/t/${slug}/matches/${match.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-edge bg-surface-sunken/60 p-3 transition hover:border-accent/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {match.team1_name ?? match.team1_source ?? "TBD"}
                          <span className="mx-2 text-ink-faint">
                            {match.status === "scheduled"
                              ? "vs"
                              : `${match.score1}:${match.score2}`}
                          </span>
                          {match.team2_name ?? match.team2_source ?? "TBD"}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-ink-faint">
                          #{match.id} · {match.stage_name}
                          {match.round_label ? ` · ${match.round_label}` : ""} · bo
                          {match.best_of} ·{" "}
                          {formatDateTime(match.scheduled_at, tournament.time_zone)}
                        </p>
                      </div>
                      <MatchStatusBadge status={match.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Добавить матч вручную" />
          <div className="p-5">
            {stages.length === 0 ? (
              <EmptyState title="Сначала создайте этап" />
            ) : (
              <MatchForm
                tournamentId={tournament.id}
                timeZone={tournament.time_zone}
                stages={stages}
                groups={groups}
                teams={teams}
              />
            )}
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
