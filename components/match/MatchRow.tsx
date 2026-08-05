import Link from "next/link";
import { MatchStatusBadge } from "@/components/ui/Badge";
import { formatTime } from "@/lib/format/date";
import { cn } from "@/lib/utils/cn";
import type { MatchDetails } from "@/lib/types/database";

function TeamLine({
  name,
  fallback,
  score,
  isWinner,
  showScore,
}: {
  name: string | null;
  fallback: string | null;
  score: number;
  isWinner: boolean;
  showScore: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <span
        className={cn(
          "truncate",
          isWinner ? "font-semibold text-ink" : "text-ink-muted",
          !name && "italic text-ink-faint",
        )}
      >
        {name ?? fallback ?? "TBD"}
      </span>
      <span
        className={cn(
          "shrink-0 tabular-nums",
          isWinner ? "font-bold text-accent" : "text-ink-muted",
        )}
      >
        {showScore ? score : "—"}
      </span>
    </div>
  );
}

export function MatchRow({
  match,
  timeZone,
  href,
}: {
  match: MatchDetails;
  timeZone: string;
  href: string;
}) {
  const showScore = match.status === "live" || match.status === "finished";
  const label = match.round_label ?? match.group_name ?? match.stage_name;

  return (
    <Link
      href={href}
      className={cn(
        "block rounded-card border bg-surface-sunken/60 p-4 transition hover:border-accent/40 hover:bg-panel",
        match.status === "live" ? "border-live/40" : "border-edge",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3 text-xs text-ink-faint">
        {/* min-w-0, or the round label refuses to shrink next to the badge and
            pushes the card past a narrow screen. */}
        <span className="min-w-0 truncate">{label}</span>
        <div className="flex shrink-0 items-center gap-2">
          <span className="tabular-nums">
            {formatTime(match.scheduled_at, timeZone)}
          </span>
          <MatchStatusBadge status={match.status} />
        </div>
      </div>

      <div className="space-y-1.5">
        <TeamLine
          name={match.team1_name}
          fallback={match.team1_source}
          score={match.score1}
          isWinner={match.winner_id !== null && match.winner_id === match.team1_id}
          showScore={showScore}
        />
        <TeamLine
          name={match.team2_name}
          fallback={match.team2_source}
          score={match.score2}
          isWinner={match.winner_id !== null && match.winner_id === match.team2_id}
          showScore={showScore}
        />
      </div>

      {match.best_of > 1 ? (
        <p className="mt-3 text-xs uppercase tracking-wide text-ink-faint">
          bo{match.best_of}
        </p>
      ) : null}
    </Link>
  );
}
