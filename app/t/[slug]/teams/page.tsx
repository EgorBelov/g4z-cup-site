import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/Card";
import { Container, PageHeader } from "@/components/ui/PageHeader";
import { TeamCard } from "@/components/team/TeamCard";
import { getRosters, getTeams, getTournament } from "@/lib/queries/public";

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
    title: tournament ? `Команды — ${tournament.name}` : "Команды",
    description: "Участники турнира и их составы.",
  };
}

export default async function TeamsPage({ params }: Props) {
  const { slug } = await params;
  const tournament = await getTournament(slug);
  if (!tournament) notFound();

  const [teams, { players, groups }] = await Promise.all([
    getTeams(slug),
    getRosters(slug),
  ]);

  const groupName = new Map(groups.map((group) => [group.id, group.name]));

  return (
    <Container className="py-8 sm:py-12">
      <PageHeader
        eyebrow={tournament.name}
        title="Команды"
        description={`Участников: ${teams.length}.`}
      />

      {teams.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="Команды ещё не заявлены" />
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <li key={team.id}>
              <TeamCard
                team={team}
                groupName={team.group_id ? groupName.get(team.group_id) : null}
                players={players.filter((player) => player.team_id === team.id)}
                href={`/t/${slug}/teams/${team.slug}`}
              />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
