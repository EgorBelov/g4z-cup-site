import Link from "next/link";
import { TournamentStatusBadge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { formatDateRange } from "@/lib/format/date";
import type { TournamentSummary } from "@/lib/types/database";

export function TournamentList({ tournaments }: { tournaments: TournamentSummary[] }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {tournaments.map((tournament) => (
        <li key={tournament.id} className="min-w-0">
          <Link
            href={`/t/${tournament.slug}`}
            className="interactive-card group flex h-full flex-col overflow-hidden rounded-card border border-edge bg-panel"
          >
            <div
              className={`tournament-cover relative flex min-h-36 items-start justify-between gap-3 p-5 ${tournament.game.toLowerCase().includes("dota") ? "bg-ember-soft text-ember" : "bg-violet-soft text-violet"}`}
            >
              <span className="inline-flex items-center gap-2 rounded-pill border border-current/20 bg-surface/60 px-3 py-1.5 text-xs">
                <Icon name="game" className="size-4" />
                {tournament.game}
              </span>
              <span className="font-mono text-xs">
                {tournament.edition
                  ? `S${String(tournament.edition).padStart(2, "0")}`
                  : "G4Z"}
              </span>
              <Icon
                name={tournament.status === "finished" ? "trophy" : "swords"}
                className="absolute bottom-3 right-6 size-20 -rotate-12 opacity-30 transition-transform duration-300 group-hover:rotate-0 group-hover:scale-110"
              />
              <span className="absolute bottom-5 left-5">
                <TournamentStatusBadge status={tournament.status} />
              </span>
            </div>
            <div className="flex flex-1 flex-col p-5 sm:p-6">
              {tournament.is_current && tournament.status !== "finished" ? (
                <span className="mb-3 flex items-center gap-1.5 text-xs text-accent">
                  <Icon name="spark" className="size-3.5" />
                  Главный кубок
                </span>
              ) : null}
              <h3 className="break-words text-2xl font-medium tracking-tight transition-colors group-hover:text-accent">
                {tournament.name}
              </h3>
              <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-ink-muted">
                <Icon name="calendar" className="size-4" />
                {formatDateRange(
                  tournament.starts_at,
                  tournament.ends_at,
                  tournament.time_zone,
                ) ?? "Даты уточняются"}
              </p>
              <div className="my-5 flex flex-wrap gap-2 text-xs text-ink-muted">
                <span className="inline-flex items-center gap-2 rounded-control bg-surface px-3 py-2">
                  <Icon name="users" className="size-4 text-accent" />
                  {tournament.team_count} команд
                </span>
                <span className="inline-flex items-center gap-2 rounded-control bg-surface px-3 py-2">
                  <Icon name="swords" className="size-4 text-accent" />
                  {tournament.match_count} матчей
                </span>
              </div>
              {tournament.champion_name ? (
                <p className="mb-5 flex items-start gap-2 rounded-control bg-accent-soft p-3 text-sm text-accent">
                  <Icon name="trophy" className="size-4" />
                  <span className="min-w-0 break-words">
                    <span className="mb-1 block text-xs text-ink-muted">
                      Победитель
                    </span>
                    {tournament.champion_name}
                  </span>
                </p>
              ) : null}
              <div className="mt-auto flex items-center justify-between border-t border-edge pt-4 text-sm text-ink-muted">
                <span>Открыть турнир</span>
                <span className="grid size-9 place-items-center rounded-pill bg-panel-strong text-accent transition group-hover:bg-accent group-hover:text-surface">
                  <Icon name="arrow" className="size-4" />
                </span>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
