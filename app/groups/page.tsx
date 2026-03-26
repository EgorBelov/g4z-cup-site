import Link from "next/link";
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
  round_name: string;
  team1_name: string | null;
  team2_name: string | null;
  score1: number;
  score2: number;
  status: string;
  scheduled_at: string | null;
  bo: string;
  match_order: number;
};

function getPlacementLabel(position: number) {
  switch (position) {
    case 1:
      return "Полуфинал";
    case 2:
      return "Четвертьфинал";
    case 3:
      return "Play-In";
    case 4:
      return "Play-In";
    default:
      return "";
  }
}

function getPlacementBadgeClass(position: number) {
  switch (position) {
    case 1:
      return "bg-emerald-500/10 text-emerald-300";
    case 2:
      return "bg-sky-500/10 text-sky-300";
    case 3:
    case 4:
      return "bg-amber-500/10 text-amber-300";
    default:
      return "bg-white/10 text-white/70";
  }
}

function normalizeRoundName(value: string) {
  return value.trim().toLowerCase();
}

function getRoundBucket(roundName: string) {
  const name = normalizeRoundName(roundName);

  if (name.includes("opening") || name.includes("open")) return "opening";
  if (name.includes("winner")) return "winners";
  if (name.includes("elimination") || name.includes("lower")) return "elimination";
  if (name.includes("decider") || name.includes("deciding") || name.includes("final")) {
    return "decider";
  }

  return "other";
}

function getRoundBucketLabel(bucket: string) {
  switch (bucket) {
    case "opening":
      return "Opening Matches";
    case "winners":
      return "Winners Match";
    case "elimination":
      return "Elimination Match";
    case "decider":
      return "Decider Match";
    default:
      return "Матчи группы";
  }
}

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

  return Array.from(grouped.entries()).map(([groupName, items]) => {
    const roundBuckets = new Map<string, GroupMatch[]>();

    for (const match of items) {
      const bucket = getRoundBucket(match.round_name);
      if (!roundBuckets.has(bucket)) roundBuckets.set(bucket, []);
      roundBuckets.get(bucket)!.push(match);
    }

    const orderedBuckets = ["opening", "winners", "elimination", "decider", "other"]
      .filter((bucket) => roundBuckets.has(bucket))
      .map((bucket) => ({
        bucket,
        label: getRoundBucketLabel(bucket),
        matches: (roundBuckets.get(bucket) ?? []).sort((a, b) => {
          const timeA = a.scheduled_at ? new Date(a.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER;
          const timeB = b.scheduled_at ? new Date(b.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER;

          if (timeA !== timeB) return timeA - timeB;
          return a.match_order - b.match_order;
        }),
      }));

    return {
      groupName,
      rounds: orderedBuckets,
    };
  });
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
            title="Группы"
            description="Две группы по 4 команды. Формат GSL, все матчи BO1. Топ-1 выходит в полуфинал, топ-2 — в четвертьфинал, топ-3 и топ-4 — в Play-In."
            actions={[
              { href: "/", label: "На главную" },
              { href: "/schedule", label: "Расписание" },
              { href: "/playoff", label: "Плей-офф" },
            ]}
          />

          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            {groupedStandings.map((group) => (
              <SectionCard key={group.groupName} className="p-5 md:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-2xl font-bold">{group.groupName}</h2>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/55">
                    gsl standings
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <table className="w-full text-left">
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
                      {group.teams.map((team, index) => (
                        <tr
                          key={team.team_id}
                          className="border-t border-white/10 bg-black/20"
                        >
                          <td className="px-4 py-3 font-semibold text-white/90">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 font-medium">{team.team_name}</td>
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
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${getPlacementBadgeClass(
                                index + 1
                              )}`}
                            >
                              {getPlacementLabel(index + 1)}
                            </span>
                          </td>
                        </tr>
                      ))}
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
                  <h2 className="text-2xl font-bold">{group.groupName}</h2>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/55">
                    group stage
                  </span>
                </div>

                <div className="space-y-6">
                  {group.rounds.map((round) => (
                    <div key={round.bucket}>
                      <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">
                        {round.label}
                      </div>

                      <div className="space-y-4">
                        {round.matches.map((match) => (
                          <div
                            key={match.id}
                            className="rounded-2xl border border-white/10 bg-black/20 p-4 md:p-5 transition hover:border-emerald-400/25 hover:bg-black/30"
                          >
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                  <StatusBadge status={match.status} />
                                  <span className="text-sm text-white/45">
                                    {match.round_name}
                                  </span>
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
                      </div>
                    </div>
                  ))}

                  {group.rounds.length === 0 && (
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