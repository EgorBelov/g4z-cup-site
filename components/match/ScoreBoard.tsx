import Link from "next/link";
import { Badge, MatchStatusBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format/date";
import { cn } from "@/lib/utils/cn";
import type { MatchDetails } from "@/lib/types/database";

export function ScoreBoard({
  match,
  timeZone,
}: {
  match: MatchDetails;
  timeZone: string;
}) {
  const showScore = match.status === "live" || match.status === "finished";
  const sides = [
    {
      id: match.team1_id,
      name: match.team1_name,
      slug: match.team1_slug,
      fallback: match.team1_source,
    },
    {
      id: match.team2_id,
      name: match.team2_name,
      slug: match.team2_slug,
      fallback: match.team2_source,
    },
  ];
  function team(index: number) {
    const side = sides[index]!;
    const title = side.name ?? side.fallback ?? "TBD";
    return (
      <div className="min-w-0 text-center">
        <p
          aria-hidden="true"
          className="mb-5 text-2xl tracking-tight text-accent sm:text-4xl"
        >
          {side.name?.slice(0, 3).toUpperCase() ?? "?"}
        </p>
        {side.slug ? (
          <Link
            href={`/t/${match.tournament_slug}/teams/${side.slug}`}
            className={cn(
              "block break-words text-sm tracking-tight hover:text-accent sm:text-2xl",
              side.id !== null && side.id === match.winner_id && "text-accent",
            )}
          >
            {title}
          </Link>
        ) : (
          <p className="break-words text-sm text-ink-muted sm:text-2xl">{title}</p>
        )}
      </div>
    );
  }
  return (
    <section className="border-y border-edge py-7 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge>{match.stage_name}</Badge>
          {match.round_label ? <Badge>{match.round_label}</Badge> : null}
          {match.group_name ? <Badge>{match.group_name}</Badge> : null}
          <Badge>BO{match.best_of}</Badge>
        </div>
        <MatchStatusBadge status={match.status} />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 py-10 sm:gap-10 sm:py-14">
        {team(0)}
        <p
          aria-label={`Счёт ${showScore ? `${match.score1}:${match.score2}` : "ещё не открыт"}`}
          className="whitespace-nowrap text-5xl leading-none tracking-[-0.06em] tabular-nums sm:text-8xl"
        >
          <span>{showScore ? match.score1 : "—"}</span>
          <span className="mx-1 text-ink-faint sm:mx-3">:</span>
          <span>{showScore ? match.score2 : "—"}</span>
        </p>
        {team(1)}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm text-ink-muted">
        <span className="mr-auto">{formatDateTime(match.scheduled_at, timeZone)}</span>
        {match.stream_url ? (
          <ButtonLink href={match.stream_url} external variant="live">
            Смотреть эфир ↗
          </ButtonLink>
        ) : null}
        {match.vod_url ? (
          <ButtonLink href={match.vod_url} external variant="secondary">
            Запись матча ↗
          </ButtonLink>
        ) : null}
      </div>
      {match.notes ? (
        <p className="mt-6 border-l-2 border-accent bg-panel px-5 py-4 text-sm leading-relaxed text-ink-muted">
          {match.notes}
        </p>
      ) : null}
    </section>
  );
}
