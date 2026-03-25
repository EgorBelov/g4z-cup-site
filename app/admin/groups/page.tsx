import Link from "next/link";
import {
  createGroupAction,
  deleteGroupAction,
  updateGroupAction,
} from "@/app/admin/actions";
import { getAdminGroupsWithTeams } from "@/lib/queries/admin";
import { getTournamentBySlug } from "@/lib/queries/tournaments";

type GroupWithTeams = {
  id: number;
  name: string;
  sort_order: number;
  teams?: {
    id: number;
    name: string;
    slug: string;
  }[];
};

export default async function AdminGroupsPage() {
  const tournament = await getTournamentBySlug("g4z-cup-10");
  const groups = (await getAdminGroupsWithTeams(
    tournament.id
  )) as GroupWithTeams[];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">
            Admin Panel
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight">
            Группы
          </h1>
          <p className="mt-3 text-white/65">
            Управление группами турнира и быстрый просмотр участников.
          </p>

          <div className="mt-5 flex gap-3">
            <Link
  href="/admin/matches"
  className="rounded-xl bg-white/10 px-4 py-2 font-medium hover:bg-white/15"
>
  Матчи
</Link>
            <Link
              href="/groups"
              className="rounded-xl bg-white/10 px-4 py-2 font-medium hover:bg-white/15"
            >
              Публичные группы
            </Link>
          </div>
        </div>

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-5 text-2xl font-bold">Новая группа</h2>

          <form action={createGroupAction} className="grid gap-4 md:grid-cols-3">
            <input type="hidden" name="tournament_id" value={tournament.id} />

            <div>
              <label className="mb-2 block text-sm font-medium text-white/70">
                Название
              </label>
              <input
                name="name"
                required
                placeholder="Group A"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/70">
                Порядок
              </label>
              <input
                name="sort_order"
                type="number"
                min="0"
                defaultValue={0}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-medium hover:bg-emerald-500"
              >
                Создать группу
              </button>
            </div>
          </form>
        </section>

        <div className="space-y-6">
          {groups.map((group) => (
            <section
              key={group.id}
              className="rounded-3xl border border-white/10 bg-white/5 p-6"
            >
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h2 className="mb-5 text-2xl font-bold">{group.name}</h2>

                  <form action={updateGroupAction} className="space-y-4">
                    <input type="hidden" name="group_id" value={group.id} />

                    <div>
                      <label className="mb-2 block text-sm font-medium text-white/70">
                        Название
                      </label>
                      <input
                        name="name"
                        defaultValue={group.name}
                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-white/70">
                        Порядок
                      </label>
                      <input
                        name="sort_order"
                        type="number"
                        min="0"
                        defaultValue={group.sort_order}
                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="rounded-xl bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-500"
                      >
                        Сохранить
                      </button>
                    </div>
                  </form>

                  <form action={deleteGroupAction} className="mt-4">
                    <input type="hidden" name="group_id" value={group.id} />
                    <button
                      type="submit"
                      className="rounded-xl bg-red-600 px-4 py-2 font-medium hover:bg-red-500"
                    >
                      Удалить группу
                    </button>
                  </form>
                </div>

                <div>
                  <h3 className="mb-4 text-xl font-semibold">Команды в группе</h3>

                  <div className="space-y-3">
                    {group.teams && group.teams.length > 0 ? (
                      group.teams.map((team) => (
                        <Link
                          key={team.id}
                          href={`/admin/teams/${team.id}`}
                          className="block rounded-2xl border border-white/10 bg-black/20 px-4 py-3 transition hover:border-emerald-400/40 hover:bg-black/30"
                        >
                          <div className="font-medium">{team.name}</div>
                          <div className="mt-1 text-sm text-white/50">
                            {team.slug}
                          </div>
                        </Link>
                      ))
                    ) : (
                      <p className="text-white/60">В этой группе пока нет команд.</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          ))}

          {groups.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/60">
              Групп пока нет.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}