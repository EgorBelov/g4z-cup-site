import Link from "next/link";
import { Badge, MatchStatusBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format/date";
import { cn } from "@/lib/utils/cn";
import type { MatchDetails } from "@/lib/types/database";

function Side({
  name,
  slug,
  fallback,
  score,
  isWinner,
  showScore,
  tournamentSlug,
  align,
}: {
  name: string | null;
  slug: string | null;
  fallback: string | null;
  score: number;
  isWinner: boolean;
  showScore: boolean;
  tournamentSlug: string;
  align: "left" | "right";
}) {
  const title = name ?? fallback ?? "TBD";

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-2",
        align === "right" ? "items-end text-right" : "items-start text-left",
      )}
    >
      {slug ? (
        <Link
          href={`/t/${tournamentSlug}/teams/${slug}`}
          className="truncate text-xl font-bold tracking-tight hover:text-accent sm:text-2xl"
        >
          {title}
        </Link>
      ) : (
        <span className="truncate text-xl font-bold tracking-tight text-ink-faint sm:text-2xl">
          {title}
        </span>
      )}
      <span
        className={cn(
          "text-4xl font-extrabold tabular-nums sm:text-5xl",
          isWinner ? "text-accent" : "text-ink-muted",
        )}
      >
        {showScore ? score : "—"}
      </span>
    </div>
  );
}

export function ScoreBoard({
  match,
  timeZone,
}: {
  match: MatchDetails;
  timeZone: string;
}) {
  const showScore = match.status === "live" || match.status === "finished";

  return (
    <section className="rounded-card border border-edge bg-gradient-to-br from-accent-soft via-panel to-info-soft p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{match.stage_name}</Badge>
          {match.round_label ? <Badge tone="neutral">{match.round_label}</Badge> : null}
          {match.group_name ? <Badge tone="neutral">{match.group_name}</Badge> : null}
          <Badge tone="info">bo{match.best_of}</Badge>
        </div>
        <MatchStatusBadge status={match.status} />
      </div>

      <div className="mt-6 flex items-start gap-4">
        <Side
          name={match.team1_name}
          slug={match.team1_slug}
          fallback={match.team1_source}
          score={match.score1}
          isWinner={match.winner_id !== null && match.winner_id === match.team1_id}
          showScore={showScore}
          tournamentSlug={match.tournament_slug}
          align="left"
        />
        <span className="pt-8 text-2xl font-bold text-ink-faint">:</span>
        <Side
          name={match.team2_name}
          slug={match.team2_slug}
          fallback={match.team2_source}
          score={match.score2}
          isWinner={match.winner_id !== null && match.winner_id === match.team2_id}
          showScore={showScore}
          tournamentSlug={match.tournament_slug}
          align="right"
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-ink-muted">
        <span>{formatDateTime(match.scheduled_at, timeZone)}</span>
        {match.stream_url ? (
          <ButtonLink href={match.stream_url} external variant="live" size="sm">
            Смотреть стрим
          </ButtonLink>
        ) : null}
        {match.vod_url ? (
          <ButtonLink href={match.vod_url} external variant="secondary" size="sm">
            Запись матча
          </ButtonLink>
        ) : null}
      </div>

      {match.notes ? (
        <p className="mt-4 rounded-control border border-edge bg-surface-sunken/60 px-4 py-3 text-sm text-ink-muted">
          {match.notes}
        </p>
      ) : null}
    </section>
  );
}
