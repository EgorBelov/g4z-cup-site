import Link from "next/link";
import { getTournamentBySlug } from "@/lib/queries/tournaments";
import { getAdminMatches } from "@/lib/queries/admin";

type AdminMatchRow = {
  id: number;
  stage: string;
  group_name: string | null;
  round_name: string;
  team1_name: string | null;
  team2_name: string | null;
  score1: number;
  score2: number;
  status: string;
  scheduled_at: string | null;
};

function formatMatchTime(value: string | null) {
  if (!value) return "TBD";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStageLabel(match: AdminMatchRow) {
  if (match.stage === "group") {
    return match.group_name ?? match.round_name;
  }

  return match.round_name;
}

function getStatusClasses(status: string) {
  switch (status) {
    case "live":
      return "bg-red-500/15 text-red-300 border-red-500/30";
    case "finished":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    default:
      return "bg-white/5 text-white/70 border-white/10";
  }
}

export default async function AdminMatchesPage() {
  const tournament = await getTournamentBySlug("g4z-cup-10");
  const matches = (await getAdminMatches(tournament.id)) as AdminMatchRow[];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">
              Admin Panel
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight">
              Матчи
            </h1>
            <p className="mt-3 text-white/65">
              Все матчи турнира с быстрым переходом к редактированию.
            </p>
          </div>

          <Link
            href="/admin/matches/new"
            className="rounded-xl bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-500"
          >
            Новый матч
          </Link>
        </div>
      </section>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-sm text-white/60">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Стадия</th>
              <th className="px-4 py-3">Матч</th>
              <th className="px-4 py-3">Время</th>
              <th className="px-4 py-3">Счет</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3">Действие</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match) => (
              <tr
                key={match.id}
                className="border-t border-white/10 bg-black/20"
              >
                <td className="px-4 py-3 font-mono text-sm">{match.id}</td>
                <td className="px-4 py-3 text-white/75">
                  {getStageLabel(match)}
                </td>
                <td className="px-4 py-3 font-medium">
                  {match.team1_name ?? "TBD"} vs {match.team2_name ?? "TBD"}
                </td>
                <td className="px-4 py-3 text-white/70">
                  {formatMatchTime(match.scheduled_at)}
                </td>
                <td className="px-4 py-3 text-white/85">
                  {match.score1} : {match.score2}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                      match.status,
                    )}`}
                  >
                    {match.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/matches/${match.id}`}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
                  >
                    Редактировать
                  </Link>
                </td>
              </tr>
            ))}

            {matches.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-white/60">
                  Матчей пока нет.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
