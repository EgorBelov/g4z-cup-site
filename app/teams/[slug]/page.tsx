import Container from "@/components/layout/Container";
import PageHero from "@/components/ui/PageHero";
import SectionCard from "@/components/ui/SectionCard";
import StatusBadge from "@/components/ui/StatusBadge";
import PrimaryButton from "@/components/ui/PrimaryButton";
import {
  getMatchesByTeamId,
  getPlayersByTeamId,
  getTeamBySlug,
} from "@/lib/queries/teams";
import Link from "next/link";

type TeamData = {
  id: number;
  name: string;
  slug: string;
  group_name: string | null;
  description: string | null;
};

type PlayerRow = {
  id: number;
  nickname: string;
  role: string | null;
  real_name: string | null;
  rating: number | null;
};

type MatchRow = {
  id: number;
  stage: string;
  group_name: string | null;
  round_name: string;
  team1_id: number | null;
  team1_name: string | null;
  team2_id: number | null;
  team2_name: string | null;
  score1: number;
  score2: number;
  status: string;
  scheduled_at: string | null;
  bo: string;
};

function formatMatchTime(value: string | null) {
  if (!value) return "TBD";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(new Date(value));
}

function getMatchLabel(match: MatchRow) {
  return match.round_name || match.group_name || "Матч";
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const team = (await getTeamBySlug(slug)) as TeamData;
  const [players, matches] = await Promise.all([
    getPlayersByTeamId(team.id),
    getMatchesByTeamId(team.id),
  ]);

  return (
    <main className="bg-slate-950 text-white">
      <Container>
        <div className="py-8 md:py-12">
          <PageHero
            eyebrow="Team Page"
            title={team.name}
            description={
              team.description ??
              `Команда турнира G4Z CUP 10. Группа: ${team.group_name ?? "без группы"}.`
            }
            // actions={[
            //   { href: "/teams", label: "Все команды" },
            //   { href: "/groups", label: "Группы" },
            //   { href: "/schedule", label: "Расписание" },
            // ]}
          />

          {/* <div className="mt-4 text-sm text-white/55">
            Группа: <span className="text-white/80">{team.group_name ?? "Без группы"}</span>
          </div> */}

          <section className="mt-8 grid gap-6 xl:grid-cols-[0.95fr_1.45fr]">
            <SectionCard className="p-5 md:p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Состав</h2>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/55">
                  roster
                </span>
              </div>

              <div className="space-y-3">
                {(players as PlayerRow[]).map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div>
                      <div className="font-semibold">{player.nickname}</div>
                      <div className="mt-1 text-sm text-white/50">
                        {player.role ?? "player"}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-white/40">Rating</div>
                      <div className="text-lg font-semibold text-emerald-300">
                        {player.rating ?? "—"}
                      </div>
                    </div>
                  </div>
                ))}

                {(players as PlayerRow[]).length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/60">
                    Состав пока не добавлен.
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard className="p-5 md:p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Матчи команды</h2>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/55">
                  matches
                </span>
              </div>

              <div className="space-y-4">
                {(matches as MatchRow[]).map((match) => {
                  const isTeam1 = match.team1_id === team.id;
                  const isTeam2 = match.team2_id === team.id;
                  const opponentName = isTeam1
                    ? match.team2_name
                    : isTeam2
                      ? match.team1_name
                      : "TBD";

                  return (
                    <Link
                      key={match.id}
                      href={`/matches/${match.id}`}
                      className="block focus:outline-none"
                    >
                      <div className="cursor-pointer rounded-2xl border border-white/10 bg-black/20 p-4 md:p-5 transition hover:border-emerald-400/25 hover:bg-black/30 active:scale-[0.99]">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/60">
                                {getMatchLabel(match)}
                              </span>
                              <StatusBadge status={match.status} />
                            </div>

                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                              <div className="text-lg font-semibold md:text-xl">
                                {match.team1_name ?? "TBD"}
                              </div>

                              <div className="text-sm text-white/35">vs</div>

                              <div className="text-lg font-semibold md:text-xl">
                                {match.team2_name ?? "TBD"}
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/55">
                              <span>{String(match.bo).toUpperCase()}</span>

                              {match.status === "finished" && (
                                <span className="rounded-full bg-emerald-500/10 px-3 py-1 font-medium text-emerald-300">
                                  {match.score1} : {match.score2}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 xl:items-end">
                            <div className="text-sm text-white/60">
                              {formatMatchTime(match.scheduled_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}

                {(matches as MatchRow[]).length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/60">
                    У команды пока нет матчей.
                  </div>
                )}
              </div>
            </SectionCard>
          </section>
        </div>
      </Container>
    </main>
  );
}
