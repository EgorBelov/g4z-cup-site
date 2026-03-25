import Link from "next/link";
import { notFound } from "next/navigation";
import Container from "@/components/layout/Container";
import {
  getMatchPageData,
  type MatchData,
  type MatchGame,
  type PickRow,
  type BanRow,
} from "@/lib/queries/match-games";

export const revalidate = 15;

function formatMatchTime(value: string | null) {
  if (!value) return "TBD";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStageLabel(match: MatchData) {
  if (match.stage === "group") {
    return match.group_name ?? match.round_name;
  }

  return match.round_name;
}

function getStatusLabel(status: string) {
  switch (status) {
    case "live":
      return "LIVE";
    case "finished":
      return "Завершен";
    default:
      return "Скоро";
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case "live":
      return "border-red-500/30 bg-red-500/15 text-red-300";
    case "finished":
      return "border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
    default:
      return "border-white/10 bg-white/5 text-white/70";
  }
}

function groupByGameId<T extends { match_game_id: number }>(rows: T[]) {
  const grouped = new Map<number, T[]>();

  for (const row of rows) {
    const existing = grouped.get(row.match_game_id);
    if (existing) {
      existing.push(row);
    } else {
      grouped.set(row.match_game_id, [row]);
    }
  }

  return grouped;
}

function splitByTeam<T extends { team_id: number }>(
  rows: T[],
  team1Id: number | null,
  team2Id: number | null
) {
  const team1: T[] = [];
  const team2: T[] = [];

  for (const row of rows) {
    if (team1Id !== null && row.team_id === team1Id) {
      team1.push(row);
    } else if (team2Id !== null && row.team_id === team2Id) {
      team2.push(row);
    }
  }

  return { team1, team2 };
}

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const matchId = Number(id);

  if (!Number.isFinite(matchId)) {
    notFound();
  }

  const { match, games, picks, bans } = await getMatchPageData(matchId);

  if (!match) {
    notFound();
  }

  const picksByGameId = groupByGameId(picks);
  const bansByGameId = groupByGameId(bans);

  return (
    <main className="bg-slate-950 text-white">
      <Container>
        <div className="py-8 md:py-12">
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm uppercase tracking-[0.2em] text-emerald-300">
                Match Page
              </span>

              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                  match.status
                )}`}
              >
                {getStatusLabel(match.status)}
              </span>
            </div>

            <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">
              {match.team1_name ?? "TBD"} vs {match.team2_name ?? "TBD"}
            </h1>

            <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/60 md:text-base">
              <span>{getStageLabel(match)}</span>
              <span>•</span>
              <span>{String(match.bo).toUpperCase()}</span>
              <span>•</span>
              <span>{formatMatchTime(match.scheduled_at)}</span>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3">
                <div className="text-sm text-white/45">Счет серии</div>
                <div className="mt-1 text-2xl font-bold">
                  {match.score1} : {match.score2}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/schedule"
                className="rounded-2xl bg-white/10 px-4 py-3 font-medium transition hover:bg-white/15"
              >
                Расписание
              </Link>
              <Link
                href="/playoff"
                className="rounded-2xl bg-white/10 px-4 py-3 font-medium transition hover:bg-white/15"
              >
                Плей-офф
              </Link>
              <Link
                href="/groups"
                className="rounded-2xl bg-white/10 px-4 py-3 font-medium transition hover:bg-white/15"
              >
                Группы
              </Link>

              {match.stream_url && (
                <a
                  href={match.stream_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl bg-purple-600 px-4 py-3 font-medium transition hover:bg-purple-500"
                >
                  Смотреть стрим
                </a>
              )}
            </div>
          </section>

          <section className="mt-8 space-y-6">
            {games.length > 0 ? (
              games.map((game: MatchGame) => {
                const gamePicks = picksByGameId.get(game.id) ?? [];
                const gameBans = bansByGameId.get(game.id) ?? [];

                const groupedPicks = splitByTeam(
                  gamePicks as PickRow[],
                  match.team1_id,
                  match.team2_id
                );
                const groupedBans = splitByTeam(
                  gameBans as BanRow[],
                  match.team1_id,
                  match.team2_id
                );

                return (
                  <div
                    key={game.id}
                    className="rounded-[28px] border border-white/10 bg-white/5 p-5 md:p-6"
                  >
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-2xl font-bold">
                          Game {game.game_number}
                        </h2>
                        <div className="mt-1 text-sm text-white/55">
                          {game.duration_minutes
                            ? `Длительность: ${game.duration_minutes} мин`
                            : "Длительность не указана"}
                        </div>
                      </div>

                      {game.winner_id && (
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
                          Winner selected
                        </span>
                      )}
                    </div>

                    <div className="grid gap-6 xl:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <h3 className="text-xl font-semibold">
                            {match.team1_name ?? "Team 1"}
                          </h3>
                          {game.winner_id === match.team1_id && (
                            <span className="rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
                              win
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="mb-3 text-sm uppercase tracking-wide text-white/45">
                            Picks
                          </div>
                          <div className="space-y-2">
                            {groupedPicks.team1.length > 0 ? (
                              groupedPicks.team1.map((pick) => (
                                <div
                                  key={pick.id}
                                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                                >
                                  <span className="font-medium">{pick.player_name}</span>{" "}
                                  <span className="text-white/35">—</span>{" "}
                                  <span className="text-emerald-300">
                                    {pick.hero_name}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/50">
                                Пики не добавлены.
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-6">
                          <div className="mb-3 text-sm uppercase tracking-wide text-white/45">
                            Bans
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {groupedBans.team1.length > 0 ? (
                              groupedBans.team1.map((ban) => (
                                <span
                                  key={ban.id}
                                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80"
                                >
                                  {ban.hero_name}
                                </span>
                              ))
                            ) : (
                              <p className="text-white/50">Баны не добавлены.</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <h3 className="text-xl font-semibold">
                            {match.team2_name ?? "Team 2"}
                          </h3>
                          {game.winner_id === match.team2_id && (
                            <span className="rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
                              win
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="mb-3 text-sm uppercase tracking-wide text-white/45">
                            Picks
                          </div>
                          <div className="space-y-2">
                            {groupedPicks.team2.length > 0 ? (
                              groupedPicks.team2.map((pick) => (
                                <div
                                  key={pick.id}
                                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                                >
                                  <span className="font-medium">{pick.player_name}</span>{" "}
                                  <span className="text-white/35">—</span>{" "}
                                  <span className="text-emerald-300">
                                    {pick.hero_name}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/50">
                                Пики не добавлены.
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-6">
                          <div className="mb-3 text-sm uppercase tracking-wide text-white/45">
                            Bans
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {groupedBans.team2.length > 0 ? (
                              groupedBans.team2.map((ban) => (
                                <span
                                  key={ban.id}
                                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80"
                                >
                                  {ban.hero_name}
                                </span>
                              ))
                            ) : (
                              <p className="text-white/50">Баны не добавлены.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {game.notes && (
                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-white/70">
                        {game.notes}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-white/60">
                Для этого матча пока не добавлены карты и пики/баны.
              </div>
            )}
          </section>
        </div>
      </Container>
    </main>
  );
}