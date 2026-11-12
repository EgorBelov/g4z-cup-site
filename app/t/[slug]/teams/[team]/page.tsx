import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/PageHeader";
import { isDota, isCs } from "@/lib/format/discipline";
import { formatDateTime } from "@/lib/format/date";
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

function initials(value: string): string {
  return value
    .replace(/^Team\s+/i, "")
    .slice(0, 2)
    .toUpperCase();
}

function plural(count: number, one: string, few: string, many: string): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
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
  const draws = matches.filter(
    (match) => match.status === "finished" && match.winner_id === null,
  ).length;
  const main = players.filter((p) => !p.is_standin);
  const rated = main.filter((p) => p.mmr !== null).length;
  const average = isDota(tournament.game) ? averageMmr(main) : null;
  const eloMain = main.filter((p) => typeof p.elo === "number");
  const averageElo =
    isCs(tournament.game) && eloMain.length
      ? Math.round(eloMain.reduce((sum, p) => sum + p.elo!, 0) / eloMain.length)
      : null;

  const facts: { label: string; value: string }[] = [
    { label: "Побед", value: String(wins) },
    { label: "Поражений", value: String(losses) },
    { label: "Ничьих", value: String(draws) },
    average !== null
      ? { label: "Средний MMR", value: formatMmr(average) ?? "—" }
      : averageElo !== null
        ? { label: "Средний Elo", value: formatMmr(averageElo) ?? "—" }
        : {
            label: "Игроков",
            value: String(players.length),
          },
  ];

  const sub = [
    tournament.name,
    team.description ?? null,
    `${players.length} ${plural(players.length, "игрок", "игрока", "игроков")}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Container className="orbit-team-page">
      <div className="orbit-page-head">
        <div>
          <h1 className="orbit-page-title">{team.name}</h1>
          <p className="orbit-page-sub">{sub}</p>
        </div>
        <div className="orbit-team-chips">
          {team.tag ? <span className="orbit-groups-window">{team.tag}</span> : null}
          <span className="orbit-groups-window">
            {wins} — {losses}
          </span>
        </div>
      </div>

      <dl className="orbit-team-facts orbit-frame">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>

      <div className="orbit-team-cols">
        <section className="orbit-team-card orbit-frame">
          <div className="orbit-team-card-head">
            <h2>Состав</h2>
            <span>
              {average !== null
                ? `средний MMR ${formatMmr(average)} · ${rated}/${main.length} с рейтингом`
                : averageElo !== null
                  ? `средний Elo ${formatMmr(averageElo)} · ${eloMain.length}/${main.length} с рейтингом`
                  : `${players.length} ${plural(players.length, "игрок", "игрока", "игроков")}`}
            </span>
          </div>

          {players.length ? (
            players.map((player) => (
              <div className="orbit-player" key={player.id}>
                <span className="mark" aria-hidden="true">
                  {initials(player.nickname)}
                </span>
                <div className="min-w-0">
                  <b>
                    {player.nickname}
                    {player.is_captain ? <em>капитан</em> : null}
                    {player.is_standin ? <em data-tone="warn">стендин</em> : null}
                  </b>
                  {player.role ? <small>{player.role}</small> : null}
                </div>
                <span className="right">
                  {isCs(tournament.game) && player.elo != null ? (
                    <b>{formatMmr(player.elo)}</b>
                  ) : null}
                  {isDota(tournament.game) && player.mmr !== null ? (
                    <b>{formatMmr(player.mmr)}</b>
                  ) : null}
                  {isCs(tournament.game) ? "Elo" : isDota(tournament.game) ? "MMR" : ""}
                </span>
              </div>
            ))
          ) : (
            <p className="orbit-cabinet-empty">Состав ещё не заявлен.</p>
          )}
        </section>

        <section className="orbit-team-card orbit-frame">
          <div className="orbit-team-card-head">
            <h2>Матчи</h2>
            <span>
              всего {matches.length}{" "}
              {plural(matches.length, "матч", "матча", "матчей")}
            </span>
          </div>

          {matches.length ? (
            matches.map((match) => {
              const isHome = match.team1_id === team.id;
              const opponent = isHome
                ? (match.team2_name ?? "TBD")
                : (match.team1_name ?? "TBD");
              const ownScore = isHome ? match.score1 : match.score2;
              const otherScore = isHome ? match.score2 : match.score1;
              const score =
                match.status === "finished"
                  ? `${ownScore}:${otherScore}`
                  : formatDateTime(match.scheduled_at, tournament.time_zone) ?? "—";

              return (
                <Link
                  prefetch={false}
                  key={match.id}
                  href={`/t/${slug}/matches/${match.id}`}
                  className="orbit-team-match"
                >
                  <span className="when">
                    {formatDateTime(match.scheduled_at, tournament.time_zone) ?? "—"}
                  </span>
                  <span className="who">
                    <i aria-hidden="true">{initials(team.name)}</i>
                    <span>{team.name}</span>
                    <em>—</em>
                    <i aria-hidden="true">{initials(opponent ?? "TBD")}</i>
                    <span>{opponent}</span>
                  </span>
                  <span
                    className="score"
                    data-win={match.status === "finished" && match.winner_id === team.id}
                  >
                    {score}
                  </span>
                </Link>
              );
            })
          ) : (
            <p className="orbit-cabinet-empty">Матчей ещё нет.</p>
          )}
        </section>
      </div>
    </Container>
  );
}
