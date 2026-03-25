import Link from "next/link";
import { getAdminDashboardStats } from "@/lib/queries/admin";
import { getTournamentBySlug } from "@/lib/queries/tournaments";
import { adminLogoutAction } from "@/app/admin/login/actions";

function formatMatchTime(value: string | null) {
  if (!value) return "TBD";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

type UpcomingMatch = {
  id: number;
  round_name: string;
  stage: string;
  group_name: string | null;
  team1_name: string | null;
  team2_name: string | null;
  scheduled_at: string | null;
};

export default async function AdminDashboardPage() {
  const tournament = await getTournamentBySlug("g4z-cup-10");
  const stats = await getAdminDashboardStats(tournament.id);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">
              Dashboard
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight">
              Управление турниром
            </h1>
            <p className="mt-3 text-white/65">
              Быстрый обзор состояния G4Z CUP 10.
            </p>
          </div>

          <form action={adminLogoutAction}>
            <button
              type="submit"
              className="rounded-xl bg-red-600 px-4 py-2 font-medium hover:bg-red-500"
            >
              Выйти
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-white/55">Команды</div>
          <div className="mt-2 text-3xl font-extrabold">{stats.teamsCount}</div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-white/55">Матчи</div>
          <div className="mt-2 text-3xl font-extrabold">{stats.matchesCount}</div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-white/55">Live</div>
          <div className="mt-2 text-3xl font-extrabold text-red-300">{stats.liveCount}</div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-white/55">Завершено</div>
          <div className="mt-2 text-3xl font-extrabold text-emerald-300">
            {stats.finishedCount}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-bold">Быстрые действия</h2>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Link
              href="/admin/matches/new"
              className="rounded-2xl bg-emerald-600 px-4 py-4 font-medium hover:bg-emerald-500"
            >
              Создать матч
            </Link>

            <Link
              href="/admin/teams/new"
              className="rounded-2xl bg-emerald-600 px-4 py-4 font-medium hover:bg-emerald-500"
            >
              Создать команду
            </Link>

            <Link
              href="/admin/groups"
              className="rounded-2xl bg-white/10 px-4 py-4 font-medium hover:bg-white/15"
            >
              Управлять группами
            </Link>

            <Link
              href="/admin/playoff"
              className="rounded-2xl bg-white/10 px-4 py-4 font-medium hover:bg-white/15"
            >
              Настроить плей-офф
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-bold">Ближайшие матчи</h2>

          <div className="mt-5 space-y-3">
            {(stats.upcomingMatches as UpcomingMatch[]).length > 0 ? (
              (stats.upcomingMatches as UpcomingMatch[]).map((match) => (
                <Link
                  key={match.id}
                  href={`/admin/matches/${match.id}`}
                  className="block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-emerald-400/40 hover:bg-black/30"
                >
                  <div className="text-sm text-white/50">
                    {match.stage === "group"
                      ? match.group_name ?? match.round_name
                      : match.round_name}
                  </div>

                  <div className="mt-1 font-semibold">
                    {match.team1_name ?? "TBD"} vs {match.team2_name ?? "TBD"}
                  </div>

                  <div className="mt-2 text-sm text-white/60">
                    {formatMatchTime(match.scheduled_at)}
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-white/60">Нет ближайших матчей.</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-2xl font-bold">Основные разделы</h2>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Link
            href="/admin"
            className="rounded-2xl bg-black/20 px-4 py-4 font-medium hover:bg-black/30"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/teams"
            className="rounded-2xl bg-black/20 px-4 py-4 font-medium hover:bg-black/30"
          >
            Команды
          </Link>
          <Link
            href="/admin/groups"
            className="rounded-2xl bg-black/20 px-4 py-4 font-medium hover:bg-black/30"
          >
            Группы
          </Link>
          <Link
            href="/admin/playoff"
            className="rounded-2xl bg-black/20 px-4 py-4 font-medium hover:bg-black/30"
          >
            Плей-офф
          </Link>
        </div>
      </section>
    </div>
  );
}
