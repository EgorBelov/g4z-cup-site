import Link from "next/link";
import { replaceTeamPlayersAction, updateTeamAction } from "@/app/admin/actions";
import {
  getAdminGroups,
  getAdminPlayersByTeamId,
  getAdminTeamById,
} from "@/lib/queries/admin";
import { getTournamentBySlug } from "@/lib/queries/tournaments";

type TeamData = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  group_id: number | null;
};

type GroupRow = {
  id: number;
  name: string;
};

type PlayerRow = {
  id: number;
  nickname: string;
  role: string | null;
  sort_order: number;
};

function getPlayerValue(players: PlayerRow[], order: number) {
  return players.find((p) => p.sort_order === order) ?? null;
}

export default async function AdminTeamEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teamId = Number(id);

  const tournament = await getTournamentBySlug("g4z-cup-10");
  const [team, groups, players] = await Promise.all([
    getAdminTeamById(teamId),
    getAdminGroups(tournament.id),
    getAdminPlayersByTeamId(teamId),
  ]);

  const typedTeam = team as TeamData;
  const typedGroups = groups as GroupRow[];
  const typedPlayers = players as PlayerRow[];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">
            Admin Panel
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight">
            Редактирование команды
          </h1>
          <p className="mt-3 text-white/65">{typedTeam.name}</p>

          <div className="mt-5 flex gap-3">
            <Link
              href="/admin/teams"
              className="rounded-xl bg-white/10 px-4 py-2 font-medium hover:bg-white/15"
            >
              Назад к командам
            </Link>
            <Link
              href={`/teams/${typedTeam.slug}`}
              className="rounded-xl bg-white/10 px-4 py-2 font-medium hover:bg-white/15"
            >
              Открыть публичную страницу
            </Link>
          </div>
        </div>

        <div className="space-y-8">
          <form
            action={updateTeamAction}
            className="rounded-3xl border border-white/10 bg-white/5 p-6"
          >
            <input type="hidden" name="team_id" value={typedTeam.id} />

            <h2 className="mb-5 text-2xl font-bold">Основная информация</h2>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">
                  Название
                </label>
                <input
                  name="name"
                  defaultValue={typedTeam.name}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">
                  Slug
                </label>
                <input
                  name="slug"
                  defaultValue={typedTeam.slug}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">
                  Группа
                </label>
                <select
                  name="group_id"
                  defaultValue={typedTeam.group_id ?? ""}
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

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-white/70">
                  Описание
                </label>
                <textarea
                  name="description"
                  rows={4}
                  defaultValue={typedTeam.description ?? ""}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                />
              </div>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-5 py-3 font-medium hover:bg-emerald-500"
              >
                Сохранить команду
              </button>
            </div>
          </form>

          <form
            action={replaceTeamPlayersAction}
            className="rounded-3xl border border-white/10 bg-white/5 p-6"
          >
            <input type="hidden" name="team_id" value={typedTeam.id} />

            <h2 className="mb-5 text-2xl font-bold">Состав</h2>

            <div className="space-y-4">
              {Array.from({ length: 5 }, (_, i) => {
                const order = i + 1;
                const player = getPlayerValue(typedPlayers, order);

                return (
                  <div key={order} className="grid gap-4 md:grid-cols-2">
                    <input
                      name={`player_nickname_${order}`}
                      defaultValue={player?.nickname ?? ""}
                      placeholder={`Игрок ${order}`}
                      className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                    />
                    <input
                      name={`player_role_${order}`}
                      defaultValue={player?.role ?? ""}
                      placeholder={`Роль ${order}`}
                      className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-6">
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-5 py-3 font-medium hover:bg-emerald-500"
              >
                Сохранить состав
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}