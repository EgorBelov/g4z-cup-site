import { notFound } from "next/navigation";
import { AdminShell, tournamentTabs } from "@/components/admin/AdminShell";
import {
  AutoFillForm,
  AwardForm,
  DeleteAwardButton,
  DeletePlacementButton,
  PlacementForm,
} from "@/components/admin/ResultsForms";
import { Card, CardHeader } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/auth/guard";
import { adminResults, adminTeams, adminTournament } from "@/lib/queries/admin";

type Props = { params: Promise<{ slug: string }> };

export default async function AdminResultsPage({ params }: Props) {
  await requireAdmin();

  const { slug } = await params;
  const tournament = await adminTournament(slug);
  if (!tournament) notFound();

  const [{ placements, awards }, teams] = await Promise.all([
    adminResults(tournament.id),
    adminTeams(tournament.id),
  ]);

  const teamName = new Map(teams.map((team) => [team.id, team.name]));

  return (
    <AdminShell
      title="Итоги"
      subtitle={tournament.name}
      tabs={tournamentTabs(slug)}
      activeHref={`/admin/t/${slug}/results`}
      publicHref={`/t/${slug}/results`}
    >
      <Card className="mb-6">
        <CardHeader title="Автозаполнение" />
        <div className="p-5">
          <AutoFillForm tournamentId={tournament.id} />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Места" hint={`Заполнено: ${placements.length}`} />
          <div className="space-y-3 p-5">
            {placements.map((placement) => (
              <div key={placement.id} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <PlacementForm
                    tournamentId={tournament.id}
                    teams={teams}
                    placement={placement}
                  />
                  {placement.team_id ? (
                    <p className="mt-1 pl-3 text-xs text-ink-faint">
                      {teamName.get(placement.team_id) ?? placement.team_label}
                    </p>
                  ) : null}
                </div>
                <DeletePlacementButton
                  tournamentId={tournament.id}
                  placementId={placement.id}
                />
              </div>
            ))}

            <div className="border-t border-edge pt-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-ink-faint">
                Добавить место
              </p>
              <PlacementForm
                tournamentId={tournament.id}
                teams={teams}
                nextPlace={placements.length + 1}
              />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Награды" hint={`Всего: ${awards.length}`} />
          <div className="space-y-5 p-5">
            {awards.map((award) => (
              <div
                key={award.id}
                className="rounded-control border border-edge bg-surface-sunken/60 p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="truncate font-medium">{award.title}</p>
                  <DeleteAwardButton tournamentId={tournament.id} awardId={award.id} />
                </div>
                <AwardForm tournamentId={tournament.id} teams={teams} award={award} />
              </div>
            ))}

            <div className="border-t border-edge pt-4">
              <p className="mb-3 text-xs uppercase tracking-wide text-ink-faint">
                Новая награда
              </p>
              <AwardForm tournamentId={tournament.id} teams={teams} />
            </div>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
