import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell, tournamentTabs } from "@/components/admin/AdminShell";
import { BulkTeamsForm, FinishedMatchForm } from "@/components/admin/HistoryForms";
import { AutoFillForm } from "@/components/admin/ResultsForms";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/auth/guard";
import {
  adminGroups,
  adminMatches,
  adminResults,
  adminStages,
  adminTeams,
  adminTournament,
} from "@/lib/queries/admin";
import { formatDateTime } from "@/lib/format/date";

type Props = { params: Promise<{ slug: string }> };

/**
 * Fast path for recording a tournament that was played before this site
 * existed: teams as a list, results as scores, places filled from those results.
 */
export default async function AdminHistoryPage({ params }: Props) {
  await requireAdmin();

  const { slug } = await params;
  const tournament = await adminTournament(slug);
  if (!tournament) notFound();

  const [teams, groups, stages, matches, { placements }] = await Promise.all([
    adminTeams(tournament.id),
    adminGroups(tournament.id),
    adminStages(tournament.id),
    adminMatches(tournament.id),
    adminResults(tournament.id),
  ]);

  const finished = matches.filter((match) => match.status === "finished");

  return (
    <AdminShell
      title="Ввод истории"
      subtitle={`${tournament.name} — быстрый способ записать уже сыгранный турнир`}
      tabs={tournamentTabs(slug)}
      activeHref={`/admin/t/${slug}/history`}
      publicHref={`/t/${slug}/results`}
    >
      <ol className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          {
            step: 1,
            title: "Команды",
            done: teams.length > 0,
            hint: `${teams.length} заведено`,
          },
          {
            step: 2,
            title: "Матчи",
            done: finished.length > 0,
            hint: `${finished.length} записано`,
          },
          {
            step: 3,
            title: "Итоговые места",
            done: placements.length > 0,
            hint: `${placements.length} заполнено`,
          },
        ].map((item) => (
          <li
            key={item.step}
            className="flex items-center gap-3 rounded-card border border-edge bg-panel p-4"
          >
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                item.done
                  ? "bg-accent text-surface"
                  : "border border-edge text-ink-faint"
              }`}
            >
              {item.done ? "✓" : item.step}
            </span>
            <span className="min-w-0">
              <span className="block font-medium">{item.title}</span>
              <span className="block text-xs text-ink-faint">{item.hint}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="space-y-6">
        <Card>
          <CardHeader
            title="1. Команды списком"
            hint="Вставьте названия — по одному в строке"
          />
          <div className="p-5">
            <BulkTeamsForm tournamentId={tournament.id} groups={groups} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="2. Сыгранный матч"
            hint="Вводите сразу счёт серии — карты под него создадутся сами"
          />
          <div className="p-5">
            {teams.length < 2 ? (
              <EmptyState
                title="Сначала добавьте хотя бы две команды"
                hint="Форма выше."
              />
            ) : (
              <FinishedMatchForm
                tournamentId={tournament.id}
                stages={stages}
                teams={teams}
              />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="3. Итоговые места"
            hint="Если внесены «Финал» и «Матч за 3 место» — топ-4 заполнится сам"
          />
          <div className="space-y-5 p-5">
            <AutoFillForm tournamentId={tournament.id} />

            {placements.length > 0 ? (
              <ul className="space-y-2">
                {placements.slice(0, 8).map((placement) => {
                  const team = teams.find((row) => row.id === placement.team_id);
                  return (
                    <li
                      key={placement.id}
                      className="flex items-center justify-between gap-3 rounded-control border border-edge bg-surface-sunken/60 px-4 py-2.5 text-sm"
                    >
                      <span className="font-semibold tabular-nums">
                        {placement.place} место
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {team?.name ?? placement.team_label ?? "—"}
                      </span>
                      {placement.note ? (
                        <span className="shrink-0 text-xs text-ink-faint">
                          {placement.note}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}

            <ButtonLink href={`/admin/t/${slug}/results`} variant="secondary" size="sm">
              Править места и награды вручную
            </ButtonLink>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Что уже записано"
            hint={`Завершённых матчей: ${finished.length}`}
          />
          <div className="p-5">
            {finished.length === 0 ? (
              <EmptyState title="Пока ни одного матча" />
            ) : (
              <ul className="space-y-2">
                {finished.map((match) => (
                  <li key={match.id}>
                    <Link
                      href={`/admin/t/${slug}/matches/${match.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-edge bg-surface-sunken/60 p-3 transition hover:border-accent/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {match.team1_name ?? "TBD"}
                          <span className="mx-2 tabular-nums text-accent">
                            {match.score1}:{match.score2}
                          </span>
                          {match.team2_name ?? "TBD"}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-faint">
                          {match.round_label ?? match.stage_name} ·{" "}
                          {formatDateTime(match.scheduled_at, tournament.time_zone)}
                        </p>
                      </div>
                      <Badge tone="neutral">bo{match.best_of}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
