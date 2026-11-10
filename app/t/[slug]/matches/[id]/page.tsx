import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { isDota } from "@/lib/format/discipline";
import { Container, PageHeader } from "@/components/ui/PageHeader";
import { ScoreBoard } from "@/components/match/ScoreBoard";
import { GameList } from "@/components/match/GameList";
import { getMatchPage, getTournament } from "@/lib/queries/public";
import { matchParams } from "@/lib/queries/params";

type Props = { params: Promise<{ slug: string; id: string }> };

export async function generateStaticParams() {
  return matchParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return metadataFor(id);
}

// `params` is runtime data, so it is resolved above and only the plain
// values are passed into this cached scope.
async function metadataFor(id: string): Promise<Metadata> {
  "use cache";
  const page = await getMatchPage(Number(id));

  if (!page) return { title: "Матч не найден" };

  const { match } = page;
  const title = `${match.team1_name ?? "TBD"} — ${match.team2_name ?? "TBD"}`;
  const score = match.status === "finished" ? ` (${match.score1}:${match.score2})` : "";

  return {
    title: `${title}${score}`,
    description: `${match.stage_name}${
      match.round_label ? ` · ${match.round_label}` : ""
    } · bo${match.best_of}`,
  };
}

export default async function MatchPage({ params }: Props) {
  const { slug, id } = await params;
  const matchId = Number(id);

  if (!Number.isInteger(matchId) || matchId <= 0) notFound();

  const [tournament, page] = await Promise.all([
    getTournament(slug),
    getMatchPage(matchId),
  ]);

  if (!tournament || !page || page.match.tournament_slug !== slug) notFound();

  const { match, games, picks, bans } = page;

  return (
    <Container className="py-8 sm:py-12">
      <div className="mb-8">
        <PageHeader
          eyebrow={tournament.name}
          title="В центре игры."
          description={`${match.stage_name} / BO${match.best_of} / ${tournament.game}`}
        />
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        <ButtonLink href={`/t/${slug}/schedule`} variant="ghost" size="sm">
          ← Расписание
        </ButtonLink>
        {match.group_id ? (
          <ButtonLink href={`/t/${slug}/groups`} variant="ghost" size="sm">
            Таблица группы
          </ButtonLink>
        ) : (
          <ButtonLink href={`/t/${slug}/bracket`} variant="ghost" size="sm">
            Сетка
          </ButtonLink>
        )}
      </div>

      <ScoreBoard match={match} timeZone={tournament.time_zone} />

      <section className="mt-8">
        <h2 className="section-title mb-6">
          {isDota(tournament.game) ? "Карты и драфт" : "Карты матча"}
        </h2>
        <GameList
          showDraft={isDota(tournament.game)}
          match={match}
          games={games}
          picks={picks}
          bans={bans}
        />
      </section>
    </Container>
  );
}
