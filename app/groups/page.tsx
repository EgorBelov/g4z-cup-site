import Container from "@/components/layout/Container";
import PageHero from "@/components/ui/PageHero";
import SectionCard from "@/components/ui/SectionCard";
import StatusBadge from "@/components/ui/StatusBadge";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { getTournamentBySlug } from "@/lib/queries/tournaments";
import { getGroupMatches, getGroupStandings } from "@/lib/queries/groups";
import Link from "next/link";

export const dynamic = "force-dynamic";

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

type StandingRow = {
  tournament_id: number;
  group_id: number;
  group_name: string;
  team_id: number;
  team_name: string;
  played: number;
  wins: number;
  losses: number;
};

type GroupMatch = {
  id: number;
  group_id: number | null;
  group_name: string | null;
  round_name: string | null;
  team1_name: string | null;
  team2_name: string | null;
  score1: number;
  score2: number;
  status: string;
  scheduled_at: string | null;
  bo: string;
};

function groupStandingsByGroup(rows: StandingRow[]) {
  const grouped = new Map<string, StandingRow[]>();

  for (const row of rows) {
    const key = row.group_name;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  }

  return Array.from(grouped.entries()).map(([groupName, teams]) => ({
    groupName,
    teams: teams.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      return a.team_name.localeCompare(b.team_name);
    }),
  }));
}

function groupMatchesByGroup(matches: GroupMatch[]) {
  const grouped = new Map<string, GroupMatch[]>();

  for (const match of matches) {
    const key = match.group_name ?? "Group";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(match);
  }

  return Array.from(grouped.entries()).map(([groupName, items]) => ({
    groupName,
    matches: items.sort((a, b) => {
      // null (TBD) отправляем в конец
      if (!a.scheduled_at && !b.scheduled_at) return 0;
      if (!a.scheduled_at) return 1;
      if (!b.scheduled_at) return -1;

      return (
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      );
    }),
  }));
}

function getPlacementLabel(position: number) {
  if (position === 1 || position === 2) return "Полуфинал";
  if (position >= 3 && position <= 6) return "Четвертьфинал";
  return "Вылет";
}

function getPlacementClass(position: number) {
  if (position === 1 || position === 2) {
    return "bg-emerald-500/10 text-emerald-300";
  }

  if (position >= 3 && position <= 6) {
    return "bg-sky-500/10 text-sky-300";
  }

  return "bg-white/10 text-white/65";
}

function getMatchLabel(match: GroupMatch) {
  return match.round_name || match.group_name || "Матч";
}

export default async function GroupsPage() {
  const tournament = await getTournamentBySlug("g4z-cup-10");
  const [standings, matches] = await Promise.all([
    getGroupStandings(tournament.id),
    getGroupMatches(tournament.id),
  ]);

  const groupedStandings = groupStandingsByGroup(standings as StandingRow[]);
  const groupedMatches = groupMatchesByGroup(matches as GroupMatch[]);

  return (
    <main className="bg-slate-950 text-white">
      <Container>
        <div className="py-8 md:py-12">
          <PageHero
            eyebrow="G4Z CUP"
            title="Групповой этап"
            description="Одна группа из 7 команд. 1–2 места выходят в полуфинал, 3–6 места — в четвертьфинал."
            // actions={[
            //   { href: "/", label: "На главную" },
            //   { href: "/schedule", label: "Расписание" },
            //   { href: "/playoff", label: "Плей-офф" },
            // ]}
          />

          <section className="mt-8 grid gap-6">
            {groupedStandings.map((group) => (
              <SectionCard key={group.groupName} className="p-5 md:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-2xl font-bold">{group.groupName}</h2>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/55">
                    standings
                  </span>
                </div>

                <div className="w-full overflow-x-auto rounded-2xl border border-white/10">
                  <table className="w-full text-left text-sm md:text-base">
                    <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/55 md:text-sm">
                      <tr>
                        <th className="px-3 py-3 md:px-4">#</th>
                        <th className="px-3 py-3 md:px-4">Команда</th>
                        <th className="px-3 py-3 text-center md:px-4">И</th>
                        <th className="px-3 py-3 text-center md:px-4">В</th>
                        <th className="px-3 py-3 text-center md:px-4">П</th>
                        <th className="hidden px-3 py-3 md:table-cell md:px-4">
                          Выход
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.teams.map((team, index) => {
                        const position = index + 1;

                        return (
                          <tr
                            key={team.team_id}
                            className="border-t border-white/10 bg-black/20"
                          >
                            <td className="px-3 py-3 font-semibold text-white/90 md:px-4">
                              {position}
                            </td>
                            <td className="px-3 py-3 font-medium break-words md:px-4">
                              {team.team_name}
                            </td>
                            <td className="px-3 py-3 text-center text-white/75 md:px-4">
                              {team.played}
                            </td>
                            <td className="px-3 py-3 text-center text-emerald-300 md:px-4">
                              {team.wins}
                            </td>
                            <td className="px-3 py-3 text-center text-white/70 md:px-4">
                              {team.losses}
                            </td>
                            <td className="hidden px-3 py-3 md:table-cell md:px-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold md:px-3 md:text-xs ${getPlacementClass(
                                  position,
                                )}`}
                              >
                                {getPlacementLabel(position)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            ))}
          </section>

          <section className="mt-10 space-y-6">
            {groupedMatches.map((group) => (
              <SectionCard key={group.groupName} className="p-5 md:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-2xl font-bold">
                    {group.groupName} Matches
                  </h2>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/55">
                    group stage
                  </span>
                </div>

                <div className="space-y-4">
                  {group.matches.map((match) => (
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

                  {group.matches.length === 0 && (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-white/60">
                      В этой группе пока нет матчей.
                    </div>
                  )}
                </div>
              </SectionCard>
            ))}
          </section>
        </div>
      </Container>
    </main>
  );
}
