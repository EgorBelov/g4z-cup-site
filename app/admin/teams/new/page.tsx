import Link from "next/link";
import { createTeamAction } from "@/app/admin/actions";
import { getAdminGroups } from "@/lib/queries/admin";
import { getTournamentBySlug } from "@/lib/queries/tournaments";

type GroupRow = {
  id: number;
  name: string;
};

export default async function AdminNewTeamPage() {
  const tournament = await getTournamentBySlug("g4z-cup-10");
  const groups = (await getAdminGroups(tournament.id)) as GroupRow[];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">
            Admin Panel
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight">
            Новая команда
          </h1>

          <div className="mt-5">
            <Link
              href="/admin/teams"
              className="rounded-xl bg-white/10 px-4 py-2 font-medium hover:bg-white/15"
            >
              Назад к командам
            </Link>
          </div>
        </div>

        <form
          action={createTeamAction}
          className="rounded-3xl border border-white/10 bg-white/5 p-6"
        >
          <input type="hidden" name="tournament_id" value={tournament.id} />

          <div className="grid gap-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/70">
                Название
              </label>
              <input
                name="name"
                required
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/70">
                Slug
              </label>
              <input
                name="slug"
                required
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/70">
                Группа
              </label>
              <select
                name="group_id"
                defaultValue=""
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              >
                <option value="">Без группы</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/70">
                Описание
              </label>
              <textarea
                name="description"
                rows={4}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-5 py-3 font-medium hover:bg-emerald-500"
            >
              Создать команду
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
