import { notFound } from "next/navigation";
import { AdminShell, tournamentTabs } from "@/components/admin/AdminShell";
import {
  AutoSeedForm,
  DeleteGroupButton,
  DeleteStageButton,
  GenerateStageForm,
  GroupForm,
  StageCreator,
  StageForm,
  SwissRoundForm,
} from "@/components/admin/StructureForms";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/auth/guard";
import {
  adminGroups,
  adminMatches,
  adminStages,
  adminTeams,
  adminTournament,
} from "@/lib/queries/admin";
import type { StageKind } from "@/lib/types/database";

type Props = { params: Promise<{ slug: string }> };

const kindNames: Record<StageKind, string> = {
  round_robin: "круговая",
  swiss: "швейцарка",
  single_elim: "single elimination",
  double_elim: "double elimination",
};

export default async function AdminStructurePage({ params }: Props) {
  await requireAdmin();

  const { slug } = await params;
  const tournament = await adminTournament(slug);
  if (!tournament) notFound();

  const [stages, groups, teams, matches] = await Promise.all([
    adminStages(tournament.id),
    adminGroups(tournament.id),
    adminTeams(tournament.id),
    adminMatches(tournament.id),
  ]);

  const groupTeamCounts = Object.fromEntries(
    groups.map((group) => [
      group.id,
      teams.filter((team) => team.group_id === group.id).length,
    ]),
  );

  return (
    <AdminShell
      title="Этапы и сетка"
      subtitle={tournament.name}
      tabs={tournamentTabs(slug)}
      activeHref={`/admin/t/${slug}/structure`}
      publicHref={`/t/${slug}/bracket`}
    >
      {stages.length === 0 ? (
        <Card>
          <CardHeader
            title="Этапов пока нет"
            hint="Обычный сценарий: сначала «Групповой этап» (круговая), затем «Плей-офф»"
          />
          <div className="p-5">
            <StageForm tournamentId={tournament.id} nextOrder={1} />
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {stages.map((stage) => {
            const stageGroups = groups.filter((group) => group.stage_id === stage.id);
            const stageMatches = matches.filter((match) => match.stage_id === stage.id);
            const isGroupStage = stage.kind === "round_robin" || stage.kind === "swiss";

            return (
              <Card key={stage.id}>
                <CardHeader
                  title={
                    <span className="flex flex-wrap items-center gap-2">
                      {stage.name}
                      <Badge tone="info">{kindNames[stage.kind]}</Badge>
                      <Badge tone="neutral">bo{stage.best_of}</Badge>
                    </span>
                  }
                  hint={`Матчей: ${stageMatches.length}${
                    stage.advance_count ? ` · проходят: ${stage.advance_count}` : ""
                  }`}
                  action={
                    <DeleteStageButton
                      tournamentId={tournament.id}
                      stageId={stage.id}
                    />
                  }
                />

                <div className="grid gap-6 p-5 lg:grid-cols-2">
                  <section>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-faint">
                      Параметры этапа
                    </h3>
                    <StageForm tournamentId={tournament.id} stage={stage} />
                  </section>

                  <section>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-faint">
                      {isGroupStage ? "Группы" : "Участники сетки"}
                    </h3>

                    {isGroupStage ? (
                      <div className="space-y-3">
                        {stageGroups.map((group) => (
                          <div
                            key={group.id}
                            className="flex items-center justify-between gap-3 rounded-control border border-edge bg-surface-sunken/60 px-4 py-3"
                          >
                            <div>
                              <p className="font-medium">{group.name}</p>
                              <p className="text-xs text-ink-faint">
                                команд: {groupTeamCounts[group.id] ?? 0}
                              </p>
                            </div>
                            <DeleteGroupButton
                              tournamentId={tournament.id}
                              groupId={group.id}
                            />
                          </div>
                        ))}

                        <GroupForm
                          tournamentId={tournament.id}
                          stageId={stage.id}
                          nextOrder={stageGroups.length + 1}
                        />

                        {stageGroups.length > 0 ? (
                          <AutoSeedForm
                            tournamentId={tournament.id}
                            stageId={stage.id}
                          />
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm text-ink-muted">
                        Участники берутся либо из итогов групп, либо по посеву команд —
                        выбирается при генерации сетки.
                      </p>
                    )}
                  </section>
                </div>

                <div className="border-t border-edge p-5">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-accent">
                    Генерация матчей
                  </h3>

                  {isGroupStage && stageGroups.length === 0 ? (
                    <EmptyState title="Сначала добавьте группу" />
                  ) : (
                    <GenerateStageForm
                      tournamentId={tournament.id}
                      stage={stage}
                      groups={stageGroups}
                      teamCount={teams.length}
                      groupTeamCounts={groupTeamCounts}
                      existingMatches={stageMatches.length}
                    />
                  )}

                  {stage.kind === "swiss" && stageGroups.length > 0 ? (
                    <div className="mt-6 border-t border-edge pt-5">
                      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-faint">
                        Следующий тур швейцарки
                      </h3>
                      <SwissRoundForm
                        tournamentId={tournament.id}
                        stage={stage}
                        groups={stageGroups}
                      />
                    </div>
                  ) : null}
                </div>
              </Card>
            );
          })}

          <StageCreator tournamentId={tournament.id} nextOrder={stages.length + 1} />
        </div>
      )}
    </AdminShell>
  );
}
