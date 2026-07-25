import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { Container, PageHeader } from "@/components/ui/PageHeader";
import { MatchRow } from "@/components/match/MatchRow";
import { StandingsTable } from "@/components/standings/StandingsTable";
import { getSchedule, getStandings, getTournament } from "@/lib/queries/public";
import type { StandingRow } from "@/lib/types/database";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return metadataFor(slug);
}

// `params` is runtime data, so it is resolved above and only the plain
// values are passed into this cached scope.
async function metadataFor(slug: string): Promise<Metadata> {
  "use cache";
  const tournament = await getTournament(slug);

  return {
    title: tournament ? `Группы — ${tournament.name}` : "Группы",
    description:
      "Таблицы групп: победы, поражения, разница по картам и кто проходит дальше.",
  };
}

export default async function GroupsPage({ params }: Props) {
  const { slug } = await params;
  const tournament = await getTournament(slug);
  if (!tournament) notFound();

  const [standings, schedule] = await Promise.all([
    getStandings(slug),
    getSchedule(slug),
  ]);

  const groups = new Map<number, StandingRow[]>();
  for (const row of standings) {
    groups.set(row.group_id, [...(groups.get(row.group_id) ?? []), row]);
  }

  return (
    <Container className="py-8 sm:py-12">
      <PageHeader
        eyebrow={tournament.name}
        title="Групповой этап"
        description="Таблицы считаются из результатов матчей — вручную ничего не проставляется."
      />

      {groups.size === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Групп ещё нет"
            hint="Как только команды распределят по группам, здесь появятся таблицы."
          />
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {[...groups.entries()].map(([groupId, rows]) => {
            const groupMatches = schedule.filter((match) => match.group_id === groupId);

            return (
              <div
                key={groupId}
                className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
              >
                <Card>
                  <CardHeader
                    title={rows[0]?.group_name ?? "Группа"}
                    hint={rows[0]?.stage_name}
                  />
                  <div className="p-5">
                    <StandingsTable rows={rows} tournamentSlug={slug} />
                  </div>
                </Card>

                <Card>
                  <CardHeader
                    title="Матчи группы"
                    hint={`Всего: ${groupMatches.length}`}
                  />
                  <div className="max-h-[32rem] space-y-3 overflow-y-auto p-5">
                    {groupMatches.length > 0 ? (
                      groupMatches.map((match) => (
                        <MatchRow
                          key={match.id}
                          match={match}
                          timeZone={tournament.time_zone}
                          href={`/t/${slug}/matches/${match.id}`}
                        />
                      ))
                    ) : (
                      <EmptyState title="Матчей в группе пока нет" />
                    )}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </Container>
  );
}
