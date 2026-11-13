import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { isDota } from "@/lib/format/discipline";
import { Container } from "@/components/ui/PageHeader";
import { formatDateTime, formatDuration } from "@/lib/format/date";
import { getMatchPage, getTournament } from "@/lib/queries/public";
import { matchParams } from "@/lib/queries/params";
import type { MatchStatus } from "@/lib/types/database";

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

const statusLabels: Record<MatchStatus, string> = {
  scheduled: "анонс",
  live: "идёт",
  finished: "завершён",
  cancelled: "отменён",
};

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .replace(/^Team\s+/i, "")
    .slice(0, 2)
    .toUpperCase();
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
  const dota = isDota(tournament.game);
  const when = formatDateTime(match.scheduled_at, tournament.time_zone);
  const sub = [
    match.stage_name,
    match.round_label ?? null,
    match.group_name ? `группа ${match.group_name}` : null,
    `BO${match.best_of}`,
    when,
  ]
    .filter(Boolean)
    .join(" · ");

  const team1Winner = match.status === "finished" && match.winner_id === match.team1_id;
  const team2Winner = match.status === "finished" && match.winner_id === match.team2_id;
  const showScore = match.status === "live" || match.status === "finished";

  return (
    <Container className="orbit-match-page">
      <div className="orbit-page-head">
        <div>
          <h1 className="orbit-page-title">Матч</h1>
          <p className="orbit-page-sub">{sub}</p>
        </div>
        <span className="orbit-groups-window">{statusLabels[match.status]}</span>
      </div>

      <div className="orbit-match-links">
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
        {match.vod_url ? (
          <ButtonLink href={match.vod_url} variant="ghost" size="sm" external>
            Запись ↗
          </ButtonLink>
        ) : null}
      </div>

      <section className="orbit-score orbit-frame">
        <div className="orbit-score-side" data-winner={team1Winner}>
          <span className="mark" aria-hidden="true">
            {match.team1_tag ?? initials(match.team1_name)}
          </span>
          <div className="min-w-0">
            <b>{match.team1_name ?? "TBD"}</b>
            {match.team1_source ? <small>{match.team1_source}</small> : null}
          </div>
        </div>

        <div className="orbit-score-middle">
          <div
            className="score"
            role="group"
            aria-label={`Счёт ${showScore ? `${match.score1}:${match.score2}` : "ещё не открыт"}`}
          >
            {showScore ? (
              <>
                {match.score1} <i>:</i> {match.score2}
              </>
            ) : (
              <i>— : —</i>
            )}
          </div>
          <p className="meta">{when ?? "Время уточняется"}</p>
        </div>

        <div className="orbit-score-side" data-right="true" data-winner={team2Winner}>
          <div className="min-w-0">
            <b>{match.team2_name ?? "TBD"}</b>
            {match.team2_source ? <small>{match.team2_source}</small> : null}
          </div>
          <span className="mark" aria-hidden="true">
            {match.team2_tag ?? initials(match.team2_name)}
          </span>
        </div>
      </section>

      <div className="orbit-match-sub">
        <h2>{dota ? "Карты и драфт" : "Карты матча"}</h2>
        <span className="note">
          {games.length
            ? `${games.length} ${games.length === 1 ? "карта" : games.length < 5 ? "карты" : "карт"}`
            : "карт пока нет"}
        </span>
      </div>

      {games.length ? (
        <div className="orbit-maps">
          {games.map((game) => {
            const gamePicks = picks.filter((pick) => pick.game_id === game.id);
            const gameBans = bans.filter((ban) => ban.game_id === game.id);
            const duration = formatDuration(game.duration_seconds);
            const winnerName =
              game.winner_id === match.team1_id
                ? (match.team1_name ?? "TBD")
                : game.winner_id === match.team2_id
                  ? (match.team2_name ?? "TBD")
                  : null;

            const column = (
              teamId: number | null,
              teamName: string | null,
              side: "left" | "right",
            ) => {
              const isWinner =
                game.winner_id !== null && teamId !== null && game.winner_id === teamId;
              const teamPicks = gamePicks.filter(
                (pick) => teamId !== null && pick.team_id === teamId,
              );
              const teamBans = gameBans.filter(
                (ban) => teamId !== null && ban.team_id === teamId,
              );

              return (
                <div
                  className="orbit-draft"
                  data-winner={isWinner}
                  data-side={side}
                  key={side}
                >
                  <h3>
                    {teamName ?? "TBD"}
                    {isWinner ? " · победа" : ""}
                  </h3>
                  {dota ? (
                    teamPicks.length ? (
                      <ul>
                        {teamPicks.map((pick) => (
                          <li key={pick.id}>
                            {pick.hero}
                            {pick.player_name ? (
                              <small>{pick.player_name}</small>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="orbit-map-note">Пики не внесены</p>
                    )
                  ) : (
                    <p className="orbit-map-note">
                      {isWinner ? "Победа на карте" : "Карта проиграна"}
                    </p>
                  )}
                  {dota && teamBans.length ? (
                    <p className="bans">
                      баны: {teamBans.map((ban) => ban.hero).join(" · ")}
                    </p>
                  ) : null}
                </div>
              );
            };

            return (
              <section className="orbit-map orbit-frame" key={game.id}>
                <div className="orbit-map-head">
                  <b>Карта {game.game_number}</b>
                  <span>
                    {duration ? `${duration} · ` : ""}
                    {winnerName ? `победа ${winnerName}` : "результат не внесён"}
                  </span>
                </div>

                {dota ? (
                  <div className="orbit-map-grid">
                    {column(match.team1_id, match.team1_name, "left")}
                    {column(match.team2_id, match.team2_name, "right")}
                  </div>
                ) : null}

                {game.dota_match_id ? (
                  <p className="orbit-map-note">
                    <a
                      href={`https://www.dotabuff.com/matches/${game.dota_match_id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Dotabuff ↗
                    </a>
                  </p>
                ) : null}

                {game.notes ? <p className="orbit-map-note">{game.notes}</p> : null}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="orbit-page-empty orbit-frame">
          <h2>Карты ещё не добавлены</h2>
          <p>Здесь появятся результаты и подробности сыгранных карт.</p>
        </div>
      )}
    </Container>
  );
}
