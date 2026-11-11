import Link from "next/link";
import { MatchStatusBadge } from "@/components/ui/Badge";
import { formatTime } from "@/lib/format/date";
import { cn } from "@/lib/utils/cn";
import type { MatchDetails } from "@/lib/types/database";

export function MatchRow({
  match,
  timeZone,
  href,
  layout = "compact",
}: {
  match: MatchDetails;
  timeZone: string;
  href: string;
  layout?: "compact" | "schedule";
}) {
  const showScore = match.status === "live" || match.status === "finished";
  if (layout === "schedule")
    return (
      <Link
        href={href}
        className="interactive-card group mb-3 grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-4 rounded-card border border-edge bg-panel p-4 sm:grid-cols-[70px_minmax(0,1fr)_auto_auto] sm:gap-7 sm:p-5"
      >
        <span className="font-mono text-sm text-ink-faint">
          {formatTime(match.scheduled_at, timeZone) ?? "—"}
        </span>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
          <span className="min-w-0 flex-1 break-words text-sm sm:text-base">
            {match.team1_name ?? match.team1_source ?? "TBD"}
          </span>
          <span className="w-fit rounded-control bg-accent-soft px-3 py-2 font-mono text-sm text-accent">
            {showScore ? `${match.score1} : ${match.score2}` : "vs"}
          </span>
          <span className="min-w-0 flex-1 break-words text-sm sm:text-base">
            {match.team2_name ?? match.team2_source ?? "TBD"}
          </span>
        </div>
        <div className="col-start-2 row-start-2 flex flex-wrap items-center gap-3 sm:col-auto sm:row-auto">
          <span className="text-xs text-ink-faint">
            BO{match.best_of} /{" "}
            {match.group_name ?? match.round_label ?? match.stage_name}
          </span>
          <MatchStatusBadge status={match.status} />
        </div>
        <span
          aria-hidden="true"
          className="col-start-3 row-start-1 text-xl text-accent sm:col-auto sm:row-auto"
        >
          ↗
        </span>
      </Link>
    );
  return (
    <Link
      href={href}
      className={cn(
        "interactive-card group mb-3 block rounded-control border bg-surface p-4 last:mb-0",
        match.status === "live" ? "border-live/30" : "border-edge",
      )}
    >
      <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2 text-xs text-ink-faint">
        <span className="min-w-0 break-words">
          {match.round_label ?? match.group_name ?? match.stage_name} / BO
          {match.best_of}
        </span>
        <MatchStatusBadge status={match.status} />
      </div>
      <div className="flex min-w-0 items-center gap-4">
        <span className="w-12 shrink-0 font-mono text-sm text-ink-faint">
          {formatTime(match.scheduled_at, timeZone) ?? "—"}
        </span>
        <div className="min-w-0 flex-1 space-y-2 text-sm">
          {[
            {
              id: match.team1_id,
              name: match.team1_name,
              fallback: match.team1_source,
              score: match.score1,
            },
            {
              id: match.team2_id,
              name: match.team2_name,
              fallback: match.team2_source,
              score: match.score2,
            },
          ].map((side, index) => (
            <div
              key={index}
              className="flex min-w-0 items-center justify-between gap-3"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-control text-xs",
                  index === 0
                    ? "bg-accent-soft text-accent"
                    : "bg-violet-soft text-violet",
                )}
              >
                {(side.name ?? "?").slice(0, 1).toUpperCase()}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 break-words",
                  side.id !== null && side.id === match.winner_id
                    ? "text-accent"
                    : "text-ink",
                  !side.name && "text-ink-faint",
                )}
              >
                {side.name ?? side.fallback ?? "TBD"}
              </span>
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-control font-mono tabular-nums",
                  side.id !== null && side.id === match.winner_id
                    ? "bg-accent-soft text-accent"
                    : "bg-panel-strong text-ink-muted",
                )}
              >
                {showScore ? side.score : "—"}
              </span>
            </div>
          ))}
        </div>
        <span
          aria-hidden="true"
          className="text-xl text-accent transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        >
          ↗
        </span>
      </div>
    </Link>
  );
}
