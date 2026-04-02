import Link from "next/link";
import { createMatchAction } from "@/app/admin/actions";
import { getAdminGroups, getAdminTeams } from "@/lib/queries/admin";
import { getTournamentBySlug } from "@/lib/queries/tournaments";

export const dynamic = "force-dynamic";

type GroupRow = {
  id: number;
  name: string;
};

type TeamRow = {
  id: number;
  name: string;
  group_name: string | null;
};

export default async function AdminNewMatchPage() {
  const tournament = await getTournamentBySlug("g4z-cup-10");
  const [groups, teams] = await Promise.all([
    getAdminGroups(tournament.id),
    getAdminTeams(tournament.id),
  ]);

  const typedGroups = groups as GroupRow[];
  const typedTeams = teams as TeamRow[];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">
            Admin Panel
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight">
            Новый матч
          </h1>

          <div className="mt-5">
            <Link
              href="/admin/matches"
              className="rounded-xl bg-white/10 px-4 py-2 font-medium hover:bg-white/15"
            >
              Назад к матчам
            </Link>
          </div>
        </div>

        <form
          action={createMatchAction}
          className="rounded-3xl border border-white/10 bg-white/5 p-6"
        >
          <input type="hidden" name="tournament_id" value={tournament.id} />

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/70">
                Stage
              </label>
              <select
                name="stage"
                defaultValue="group"
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              >
                <option value="group">group</option>
                <option value="playoff">playoff</option>
              </select>
            </div>

            <div>
  <label className="mb-2 block text-sm font-medium text-white/70">
    Round name
  </label>

  <input
    name="round_name"
    required
    placeholder="Например: Round 1, Quarterfinal 1, Play-In 3, Replay 5"
    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/35"
  />

  <p className="mt-2 text-sm text-white/45">
    Примеры: Round 1, Quarterfinal 1, Semifinal 2, Grand Final, Play-In 3, Replay 5
  </p>
</div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/70">
                Group
              </label>
              <select
                name="group_id"
                defaultValue=""
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              >
                <option value="">Без группы</option>
                {typedGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/70">
                BO
              </label>
              <select
                name="bo"
                defaultValue="bo1"
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              >
                <option value="bo1">bo1</option>
                <option value="bo3">bo3</option>
                <option value="bo5">bo5</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/70">
                Team 1
              </label>
              <select
                name="team1_id"
                defaultValue=""
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              >
                <option value="">TBD</option>
                {typedTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                    {team.group_name ? ` (${team.group_name})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/70">
                Team 2
              </label>
              <select
                name="team2_id"
                defaultValue=""
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              >
                <option value="">TBD</option>
                {typedTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                    {team.group_name ? ` (${team.group_name})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/70">
                Время матча
              </label>
              <input
                name="scheduled_at"
                type="datetime-local"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/70">
                Match order
              </label>
              <input
                name="match_order"
                type="number"
                min="0"
                defaultValue={0}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-white/70">
                Stream URL
              </label>
              <input
                name="stream_url"
                type="url"
                placeholder="https://twitch.tv/..."
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-5 py-3 font-medium hover:bg-emerald-500"
            >
              Создать матч
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
