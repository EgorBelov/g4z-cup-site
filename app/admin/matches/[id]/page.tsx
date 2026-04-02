import Link from "next/link";
import {
  createMatchGameAction,
  deleteMatchGameAction,
  updateMatchAction,
  updateMatchGameAction,
} from "@/app/admin/actions";
import { getAdminMatchById, getAdminMatchGames } from "@/lib/queries/admin";

export const dynamic = "force-dynamic";

type AdminMatch = {
  id: number;
  stage: string;
  group_name: string | null;
  round_name: string;
  team1_id: number | null;
  team1_name: string | null;
  team2_id: number | null;
  team2_name: string | null;
  score1: number;
  score2: number;
  status: string;
  scheduled_at: string | null;
  stream_url: string | null;
  notes: string | null;
  bo: string;
};

type MatchGame = {
  id: number;
  match_id: number;
  game_number: number;
  winner_id: number | null;
  duration_minutes: number | null;
  notes: string | null;
};

function toDatetimeLocalValue(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getStageLabel(match: AdminMatch) {
  if (match.stage === "group") {
    return match.group_name ?? match.round_name;
  }

  return match.round_name;
}

export default async function AdminMatchEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const matchId = Number(id);

  const match = (await getAdminMatchById(matchId)) as AdminMatch;
  const games = (await getAdminMatchGames(matchId)) as MatchGame[];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">
            Admin Panel
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight">
            Редактирование матча #{match.id}
          </h1>
          <p className="mt-3 text-white/65">
            {match.team1_name ?? "TBD"} vs {match.team2_name ?? "TBD"} ·{" "}
            {getStageLabel(match)} · {String(match.bo).toUpperCase()}
          </p>

          <div className="mt-5 flex gap-3">
            <Link
              href="/admin/matches"
              className="rounded-xl bg-white/10 px-4 py-2 font-medium hover:bg-white/15"
            >
              Назад к матчам
            </Link>
            <Link
              href={`/matches/${match.id}`}
              className="rounded-xl bg-white/10 px-4 py-2 font-medium hover:bg-white/15"
            >
              Открыть матч
            </Link>
          </div>
        </div>

        <form
          action={updateMatchAction}
          className="rounded-3xl border border-white/10 bg-white/5 p-6"
        >
          <input type="hidden" name="id" value={match.id} />

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/70">
                Team 1
              </label>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                {match.team1_name ?? "TBD"}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/70">
                Team 2
              </label>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                {match.team2_name ?? "TBD"}
              </div>
            </div>

            <div>
              <label
                htmlFor="scheduled_at"
                className="mb-2 block text-sm font-medium text-white/70"
              >
                Время матча
              </label>
              <input
                id="scheduled_at"
                name="scheduled_at"
                type="datetime-local"
                defaultValue={toDatetimeLocalValue(match.scheduled_at)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
              />
            </div>

            {/* <div>
              <label
                htmlFor="status"
                className="mb-2 block text-sm font-medium text-white/70"
              >
                Статус
              </label>
              <select
                id="status"
                name="status"
                defaultValue={match.status}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
              >
                <option value="upcoming">upcoming</option>
                <option value="live">live</option>
                <option value="finished">finished</option>
              </select>
            </div> */}
<div>
  <label className="mb-2 block text-sm font-medium text-white/70">
    Статус матча
  </label>
  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
    <span className="text-lg font-semibold text-white">{match.status}</span>
    <p className="mt-2 text-sm text-white/50">
      Статус рассчитывается автоматически по играм матча.
    </p>
  </div>
</div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-white/70">
                Текущий счет матча
              </label>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <span className="text-lg font-semibold text-white">
                  {match.score1} : {match.score2}
                </span>
                <p className="mt-2 text-sm text-white/50">
                  Счет рассчитывается автоматически по победителям игр матча
                  ниже.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <label
              htmlFor="stream_url"
              className="mb-2 block text-sm font-medium text-white/70"
            >
              Stream URL
            </label>
            <input
              id="stream_url"
              name="stream_url"
              type="url"
              defaultValue={match.stream_url ?? ""}
              placeholder="https://twitch.tv/..."
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
            />
          </div>

          <div className="mt-6">
            <label
              htmlFor="notes"
              className="mb-2 block text-sm font-medium text-white/70"
            >
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={match.notes ?? ""}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
            />
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-5 py-3 font-medium hover:bg-emerald-500"
            >
              Сохранить матч
            </button>

            <Link
              href="/admin"
              className="rounded-xl bg-white/10 px-5 py-3 font-medium hover:bg-white/15"
            >
              Отмена
            </Link>
          </div>
        </form>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold">Игры матча</h2>

           <form action={createMatchGameAction}>
  <input type="hidden" name="match_id" value={match.id} />
  <button
    type="submit"
    className="rounded-xl bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-500"
  >
    Добавить игру
  </button>
</form>
          </div>

          <div className="space-y-5">
            {games.length > 0 ? (
              games.map((game) => (
                <div
                  key={game.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-5"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="text-xl font-semibold">
                      Game {game.game_number}
                    </div>

                    <Link
                      href={`/admin/matches/${match.id}/games/${game.id}`}
                      className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15"
                    >
                      Picks / Bans
                    </Link>
                  </div>

                  <form
                    action={updateMatchGameAction}
                    className="grid gap-4 md:grid-cols-3"
                  >
                    <input type="hidden" name="game_id" value={game.id} />
                    <input type="hidden" name="match_id" value={match.id} />

                    <div>
                      <label className="mb-2 block text-sm text-white/70">
                        Победитель
                      </label>
                      <select
                        name="winner_id"
                        defaultValue={game.winner_id ?? ""}
                        className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                      >
                        <option value="">Не выбран</option>
                        {match.team1_id && (
                          <option value={match.team1_id}>
                            {match.team1_name}
                          </option>
                        )}
                        {match.team2_id && (
                          <option value={match.team2_id}>
                            {match.team2_name}
                          </option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/70">
                        Длительность (мин)
                      </label>
                      <input
                        name="duration_minutes"
                        type="number"
                        min="0"
                        defaultValue={game.duration_minutes ?? ""}
                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="mb-2 block text-sm text-white/70">
                        Notes
                      </label>
                      <textarea
                        name="notes"
                        rows={3}
                        defaultValue={game.notes ?? ""}
                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                      />
                    </div>

                    <div className="md:col-span-3 flex flex-wrap gap-3">
                      <button
                        type="submit"
                        className="rounded-xl bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-500"
                      >
                        Сохранить игру
                      </button>
                    </div>
                  </form>

                  <form action={deleteMatchGameAction} className="mt-3">
                    <input type="hidden" name="game_id" value={game.id} />
                    <input type="hidden" name="match_id" value={match.id} />
                    <button
                      type="submit"
                      className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium hover:bg-red-500"
                    >
                      Удалить игру
                    </button>
                  </form>
                </div>
              ))
            ) : (
              <p className="text-white/60">
                Для матча пока нет добавленных игр.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
