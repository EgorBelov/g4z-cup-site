import Link from "next/link";
import Container from "@/components/layout/Container";
import { getTournamentBySlug } from "@/lib/queries/tournaments";
import { getTeams } from "@/lib/queries/teams";

type TeamRow = {
  id: number;
  name: string;
  slug: string;
  group_name: string | null;
  logo_url: string | null;
};

function groupTeamsByGroup(teams: TeamRow[]) {
  const grouped = new Map<string, TeamRow[]>();

  for (const team of teams) {
    const key = team.group_name ?? "Без группы";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(team);
  }

  return Array.from(grouped.entries()).map(([groupName, items]) => ({
    groupName,
    teams: items,
  }));
}

export default async function TeamsPage() {
  const tournament = await getTournamentBySlug("g4z-cup-10");
  const teams = (await getTeams(tournament.id)) as TeamRow[];
  const groupedTeams = groupTeamsByGroup(teams);

  return (
    <main className="bg-slate-950 text-white">
      <Container>
        <div className="py-8 md:py-12">
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 md:p-8">
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">
              G4Z CUP
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">
              Команды
            </h1>
            <p className="mt-4 max-w-2xl text-white/65">
              Все участники турнира, распределенные по группам.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-2xl bg-white/10 px-4 py-3 font-medium transition hover:bg-white/15"
              >
                На главную
              </Link>
              <Link
                href="/groups"
                className="rounded-2xl bg-white/10 px-4 py-3 font-medium transition hover:bg-white/15"
              >
                Группы
              </Link>
              <Link
                href="/schedule"
                className="rounded-2xl bg-white/10 px-4 py-3 font-medium transition hover:bg-white/15"
              >
                Расписание
              </Link>
            </div>
          </section>

          <div className="mt-8 space-y-8">
            {groupedTeams.map((group) => (
              <section
                key={group.groupName}
                className="rounded-[28px] border border-white/10 bg-white/5 p-5 md:p-6"
              >
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-2xl font-bold">{group.groupName}</h2>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/55">
                    teams
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {group.teams.map((team) => (
                    <Link
                      key={team.id}
                      href={`/teams/${team.slug}`}
                      className="group rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-emerald-400/30 hover:bg-black/30"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-lg font-semibold transition group-hover:text-emerald-300">
                            {team.name}
                          </div>
                          <div className="mt-2 text-sm text-white/50">
                            {team.group_name ?? "Без группы"}
                          </div>
                        </div>

                        <div className="rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
                          Team
                        </div>
                      </div>

                      <div className="mt-5 text-sm text-white/45">
                        Открыть страницу команды →
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </Container>
    </main>
  );
}