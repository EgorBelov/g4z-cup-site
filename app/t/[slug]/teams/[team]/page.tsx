import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { Container, PageHeader } from "@/components/ui/PageHeader";
import { MatchRow } from "@/components/match/MatchRow";
import { averageMmr, formatMmr } from "@/lib/format/mmr";
import { getTeamPage, getTournament } from "@/lib/queries/public";
import { teamParams } from "@/lib/queries/params";

type Props = { params: Promise<{ slug: string; team: string }> };

export async function generateStaticParams() {
  return teamParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, team } = await params;
  return metadataFor(slug, team);
}

// `params` is runtime data, so it is resolved above and only the plain
// values are passed into this cached scope.
async function metadataFor(slug: string, team: string): Promise<Metadata> {
  "use cache";
  const page = await getTeamPage(slug, team);

  if (!page) return { title: "Команда не найдена" };

  return {
    title: page.team.name,
    description:
      page.team.description ??
      `Состав и матчи команды ${page.team.name} на турнире G4Z CUP.`,
  };
}

export default async function TeamPage({ params }: Props) {
  const { slug, team: teamSlug } = await params;

  const [tournament, page] = await Promise.all([
    getTournament(slug),
    getTeamPage(slug, teamSlug),
  ]);

  if (!tournament || !page) notFound();

  const { team, players, matches } = page;
  const wins = matches.filter(
    (match) => match.status === "finished" && match.winner_id === team.id,
  ).length;
  const losses = matches.filter(
    (match) =>
      match.status === "finished" &&
      match.winner_id !== null &&
      match.winner_id !== team.id,
  ).length;
  const average = averageMmr(players);

  return (
    <Container className="py-8 sm:py-12">
      <PageHeader
        eyebrow={tournament.name}
        title={team.name}
        description={team.description ?? undefined}
        actions={
          <>
            {team.tag ? <Badge tone="neutral">{team.tag}</Badge> : null}
            {team.seed ? <Badge tone="info">посев {team.seed}</Badge> : null}
            <Badge tone="accent">
              {wins}–{losses}
            </Badge>
          </>
        }
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card>
          <CardHeader
            title="Состав"
            hint={
              average !== null
                ? `Игроков: ${players.length} · средний MMR ${formatMmr(average)}`
                : `Игроков: ${players.length}`
            }
          />
          <div className="p-5">
            {players.length > 0 ? (
              <ul className="space-y-2">
                {players.map((player) => (
                  <li
                    key={player.id}
                    className="flex items-center justify-between gap-3 rounded-control border border-edge bg-surface-sunken/60 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {player.nickname}
                        {player.is_captain ? (
                          <span className="ml-2 text-[10px] uppercase text-accent">
                            капитан
                          </span>
                        ) : null}
                        {player.is_standin ? (
                          <span className="ml-2 text-[10px] uppercase text-warn">
                            стендин
                          </span>
                        ) : null}
                      </p>
                      {player.real_name ? (
                        <p className="truncate text-xs text-ink-faint">
                          {player.real_name}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-right text-xs text-ink-faint">
                      {player.mmr !== null ? (
                        <span className="block tabular-nums">
                          {formatMmr(player.mmr)} MMR
                        </span>
                      ) : null}
                      {player.role ? (
                        <span className="block">{player.role}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Состав ещё не заявлен" />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Матчи" hint={`Всего: ${matches.length}`} />
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {matches.length > 0 ? (
              matches.map((match) => (
                <MatchRow
                  key={match.id}
                  match={match}
                  timeZone={tournament.time_zone}
                  href={`/t/${slug}/matches/${match.id}`}
                />
              ))
            ) : (
              <EmptyState title="Матчей ещё нет" />
            )}
          </div>
        </Card>
      </div>
    </Container>
  );
}
