import Link from "next/link";
import { getTournamentBySlug } from "@/lib/queries/tournaments";
import { getAdminTeams } from "@/lib/queries/admin";

type AdminTeamRow = {
  id: number;
  name: string;
  slug: string;
  group_name: string | null;
};

export default async function AdminTeamsPage() {
  const tournament = await getTournamentBySlug("g4z-cup-10");
  const teams = (await getAdminTeams(tournament.id)) as AdminTeamRow[];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">
            Admin Panel
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight">
            Управление командами
          </h1>

          <div className="mt-5 flex gap-3">
            <Link
              href="/admin"
              className="rounded-xl bg-white/10 px-4 py-2 font-medium hover:bg-white/15"
            >
              Матчи
            </Link>
            <Link
              href="/teams"
              className="rounded-xl bg-white/10 px-4 py-2 font-medium hover:bg-white/15"
            >
              Публичные команды
            </Link>
            <Link
  href="/admin/teams/new"
  className="rounded-xl bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-500"
>
  Новая команда
</Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-sm text-white/60">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Команда</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Группа</th>
                <th className="px-4 py-3">Действие</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.id} className="border-t border-white/10 bg-black/20">
                  <td className="px-4 py-3 font-mono text-sm">{team.id}</td>
                  <td className="px-4 py-3 font-medium">{team.name}</td>
                  <td className="px-4 py-3 text-white/70">{team.slug}</td>
                  <td className="px-4 py-3 text-white/70">{team.group_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/teams/${team.id}`}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
                    >
                      Редактировать
                    </Link>
                  </td>
                </tr>
              ))}

              {teams.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-white/60">
                    Команд пока нет.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
