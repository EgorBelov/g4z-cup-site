import Link from "next/link";
import { TournamentStatusBadge } from "@/components/ui/Badge";
import { formatDateRange } from "@/lib/format/date";
import type { TournamentSummary } from "@/lib/types/database";

export function TournamentList({ tournaments }: { tournaments: TournamentSummary[] }) {
  return (
    <ul className="border-b border-edge">
      {tournaments.map((tournament) => (
        <li key={tournament.id} className="border-t border-edge">
          <Link
            href={`/t/${tournament.slug}`}
            className="group grid items-center gap-5 py-7 transition hover:bg-panel/40 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[160px_minmax(0,1fr)_200px_auto]"
          >
            <div className="eyebrow">
              <span className="text-accent">{tournament.game}</span>
              <br />
              {tournament.edition ? `Сезон ${tournament.edition}` : "G4Z CUP"}
            </div>
            <div className="min-w-0">
              <h3 className="break-words text-2xl font-normal tracking-tight group-hover:text-accent sm:text-3xl">
                {tournament.name}
              </h3>
              <p className="mt-2 text-sm text-ink-faint">
                {formatDateRange(
                  tournament.starts_at,
                  tournament.ends_at,
                  tournament.time_zone,
                ) ?? "Даты уточняются"}
              </p>
            </div>
            <div className="text-sm text-ink-faint">
              <p>
                {tournament.team_count} команд / {tournament.match_count} матчей
              </p>
              {tournament.champion_name ? (
                <p className="mt-2 break-words text-ink">
                  Победитель — {tournament.champion_name}
                </p>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-5 sm:justify-end">
              <div className="flex flex-col items-start gap-2">
                <TournamentStatusBadge status={tournament.status} />
                {tournament.is_current && tournament.status !== "finished" ? (
                  <span className="text-xs text-accent">Главный кубок</span>
                ) : null}
              </div>
              <span
                aria-hidden="true"
                className="text-2xl text-accent transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
              >
                ↗
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
