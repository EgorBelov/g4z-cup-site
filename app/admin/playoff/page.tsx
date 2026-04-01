import Link from "next/link";
import { updatePlayoffMatchSlotsAction } from "@/app/admin/actions";
import { getAdminPlayoffMatches, getAdminTeams } from "@/lib/queries/admin";
import { getTournamentBySlug } from "@/lib/queries/tournaments";

export const dynamic = "force-dynamic";

type PlayoffMatch = {
  id: number;
  stage: string;
  round_name: string;
  match_order: number;
  team1_id: number | null;
  team1_name: string | null;
  team2_id: number | null;
  team2_name: string | null;
  scheduled_at: string | null;
  stream_url: string | null;
  score1: number;
  score2: number;
  status: string;
};

type TeamRow = {
  id: number;
  name: string;
  group_name: string | null;
};

function toDatetimeLocalValue(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getStageLabel(stage: string) {
  switch (stage) {
    case "play_in":
      return "Play-In";
    case "playoff":
      return "Плей-офф";
    default:
      return stage;
  }
}

export default async function AdminPlayoffPage() {
  const tournament = await getTournamentBySlug("g4z-cup-10");
  const [matches, teams] = await Promise.all([
    getAdminPlayoffMatches(tournament.id),
    getAdminTeams(tournament.id),
  ]);

  const typedMatches = matches as PlayoffMatch[];
  const typedTeams = teams as TeamRow[];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">
            Admin Panel
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight">
            Play-In и плей-офф
          </h1>
          <p className="mt-3 text-white/65">
            Здесь можно вручную расставить команды по слотам матчей Play-In и
            основной сетки.
          </p>

          <div className="mt-5 flex gap-3">
            <Link
              href="/admin/matches"
              className="rounded-xl bg-white/10 px-4 py-2 font-medium hover:bg-white/15"
            >
              Матчи
            </Link>
            <Link
              href="/playoff"
              className="rounded-xl bg-white/10 px-4 py-2 font-medium hover:bg-white/15"
            >
              Публичный плей-офф
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          {typedMatches.map((match) => (
            <form
              key={match.id}
              action={updatePlayoffMatchSlotsAction}
              className="rounded-3xl border border-white/10 bg-white/5 p-6"
            >
              <input type="hidden" name="match_id" value={match.id} />

              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="mb-2 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/60">
                    {getStageLabel(match.stage)}
                  </div>
                  <h2 className="text-2xl font-bold">{match.round_name}</h2>
                  <p className="mt-1 text-white/60">
                    Текущий счет: {match.score1} : {match.score2} ·{" "}
                    {match.status}
                  </p>
                </div>

                <Link
                  href={`/admin/matches/${match.id}`}
                  className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15"
                >
                  Открыть матч
                </Link>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Team 1
                  </label>
                  <select
                    name="team1_id"
                    defaultValue={match.team1_id ?? ""}
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
                    defaultValue={match.team2_id ?? ""}
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
                    defaultValue={toDatetimeLocalValue(match.scheduled_at)}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Stream URL
                  </label>
                  <input
                    name="stream_url"
                    type="url"
                    defaultValue={match.stream_url ?? ""}
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
                  Сохранить слот
                </button>
              </div>
            </form>
          ))}
        </div>
      </div>
    </main>
  );
}
