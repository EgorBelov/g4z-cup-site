import Link from "next/link";
import Container from "@/components/layout/Container";
import PageHero from "@/components/ui/PageHero";
import SectionCard from "@/components/ui/SectionCard";
import StatusBadge from "@/components/ui/StatusBadge";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { getScheduleMatches } from "@/lib/queries/matches";
import { getTournamentBySlug } from "@/lib/queries/tournaments";

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

function getMatchLabel(match: {
  stage: string;
  group_name: string | null;
  round_name: string;
}) {
  return match.round_name || match.group_name || "Матч";
}

export default async function SchedulePage() {
  const tournament = await getTournamentBySlug("g4z-cup-10");
  const matches = await getScheduleMatches(tournament.id);

  return (
    <main className="bg-slate-950 text-white">
      <Container>
        <div className="py-8 md:py-12">
          <PageHero
            eyebrow="G4Z CUP"
            title="Расписание матчей"
            description="Все матчи турнира: групповой этап, плей-офф, live-статусы и результаты в одном месте."
            // actions={[
            //   { href: "/", label: "На главную" },
            //   { href: "/groups", label: "Группы" },
            //   { href: "/playoff", label: "Плей-офф" },
            // ]}
          />

          <div className="mt-8">
            <SectionCard className="p-4 md:p-6">
              {matches.length > 0 ? (
                <div className="space-y-4">
                  {matches.map((match) => (
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
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-white/60">
                  Матчей пока нет.
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </Container>
    </main>
  );
}
