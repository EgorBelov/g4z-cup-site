import Container from "@/components/layout/Container";
import PageHero from "@/components/ui/PageHero";
import SectionCard from "@/components/ui/SectionCard";
import StatusBadge from "@/components/ui/StatusBadge";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { getTournamentBySlug } from "@/lib/queries/tournaments";
import { getGroupMatches, getGroupStandings } from "@/lib/queries/groups";

function formatMatchTime(value: string | null) {
  if (!value) return "TBD";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
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
    matches: items,
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
            actions={[
              { href: "/", label: "На главную" },
              { href: "/schedule", label: "Расписание" },
              { href: "/playoff", label: "Плей-офф" },
            ]}
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

                <div className="overflow-x-auto rounded-2xl border border-white/10">
  <table className="w-full min-w-[640px] text-left">
                    <thead className="bg-white/5 text-sm text-white/55">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Команда</th>
                        <th className="px-4 py-3 text-center">И</th>
                        <th className="px-4 py-3 text-center">В</th>
                        <th className="px-4 py-3 text-center">П</th>
                        <th className="px-4 py-3">Выход</th>
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
                            <td className="px-4 py-3 font-semibold text-white/90">
                              {position}
                            </td>
                            <td className="px-4 py-3 font-medium">
                              {team.team_name}
                            </td>
                            <td className="px-4 py-3 text-center text-white/75">
                              {team.played}
                            </td>
                            <td className="px-4 py-3 text-center text-emerald-300">
                              {team.wins}
                            </td>
                            <td className="px-4 py-3 text-center text-white/70">
                              {team.losses}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${getPlacementClass(
                                  position
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
                  <h2 className="text-2xl font-bold">{group.groupName} Matches</h2>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/55">
                    group stage
                  </span>
                </div>

                <div className="space-y-4">
                  {group.matches.map((match) => (
                    <div
                      key={match.id}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4 md:p-5 transition hover:border-emerald-400/25 hover:bg-black/30"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
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

                          <PrimaryButton href={`/matches/${match.id}`}>
                            Матч
                          </PrimaryButton>
                        </div>
                      </div>
                    </div>
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