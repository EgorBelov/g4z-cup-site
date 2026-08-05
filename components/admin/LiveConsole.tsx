"use client";

import Link from "next/link";
import { IconSubmit } from "@/components/ui/Form";
import { MatchStatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { recordGameWinnerAction, undoLastGameAction } from "@/lib/actions/games";
import { setMatchStatusAction } from "@/lib/actions/matches";
import { formatDateTime } from "@/lib/format/date";
import type { MatchDetails } from "@/lib/types/database";

/**
 * The screen an organiser actually holds during a tournament: one tap per map
 * result, undo next to it, everything reachable with a thumb.
 */
function WinnerButton({
  matchId,
  teamId,
  label,
  score,
}: {
  matchId: number;
  teamId: number;
  label: string;
  score: number;
}) {
  return (
    <form action={recordGameWinnerAction} className="flex-1">
      <input type="hidden" name="match_id" value={matchId} />
      <input type="hidden" name="winner_id" value={teamId} />
      <button
        type="submit"
        className="flex w-full flex-col items-center gap-1 rounded-card border border-accent/30 bg-accent-soft px-4 py-5 text-center transition active:scale-[0.98]"
      >
        <span className="text-3xl font-extrabold tabular-nums text-accent">
          {score}
        </span>
        <span className="line-clamp-2 text-sm font-medium">{label}</span>
        <span className="text-[11px] uppercase tracking-wide text-ink-faint">
          выиграл карту
        </span>
      </button>
    </form>
  );
}

export function LiveMatchCard({
  match,
  timeZone,
  adminHref,
}: {
  match: MatchDetails;
  timeZone: string;
  adminHref: string;
}) {
  // A bo2 is played out in full instead of stopping at a clinch, so it is
  // described by its map count, not by a number of wins.
  const needed = Math.floor(match.best_of / 2) + 1;
  const target =
    match.best_of % 2 === 0
      ? `${match.best_of} карты, возможна ничья`
      : `до ${needed} побед`;

  return (
    <Card className="border-live/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge px-5 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {match.stage_name}
            {match.round_label ? ` · ${match.round_label}` : ""}
          </p>
          <p className="text-xs text-ink-faint">
            bo{match.best_of} · {target} ·{" "}
            {formatDateTime(match.scheduled_at, timeZone)}
          </p>
        </div>
        <MatchStatusBadge status={match.status} />
      </div>

      <div className="p-5">
        {match.team1_id && match.team2_id ? (
          <div className="flex gap-3">
            <WinnerButton
              matchId={match.id}
              teamId={match.team1_id}
              label={match.team1_name ?? "Команда 1"}
              score={match.score1}
            />
            <WinnerButton
              matchId={match.id}
              teamId={match.team2_id}
              label={match.team2_name ?? "Команда 2"}
              score={match.score2}
            />
          </div>
        ) : (
          <p className="text-sm text-ink-faint">
            В матче ещё не определены обе команды.
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <form action={undoLastGameAction}>
            <input type="hidden" name="match_id" value={match.id} />
            <IconSubmit title="Отменить последнюю карту" variant="danger">
              ↺ Отменить карту
            </IconSubmit>
          </form>

          <Link
            href={adminHref}
            className="rounded-control border border-edge bg-panel px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
          >
            Драфт и детали
          </Link>
        </div>
      </div>
    </Card>
  );
}

export function StartMatchCard({
  match,
  timeZone,
  adminHref,
}: {
  match: MatchDetails;
  timeZone: string;
  adminHref: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-edge bg-surface-sunken/60 p-4">
      <div className="min-w-0">
        <p className="truncate font-medium">
          {match.team1_name ?? match.team1_source ?? "TBD"}
          <span className="mx-2 text-ink-faint">vs</span>
          {match.team2_name ?? match.team2_source ?? "TBD"}
        </p>
        <p className="mt-0.5 text-xs text-ink-faint">
          {match.stage_name}
          {match.round_label ? ` · ${match.round_label}` : ""} · bo{match.best_of} ·{" "}
          {formatDateTime(match.scheduled_at, timeZone)}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={adminHref}
          className="rounded-control border border-edge bg-panel px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
        >
          Открыть
        </Link>
        <form action={setMatchStatusAction}>
          <input type="hidden" name="match_id" value={match.id} />
          <input type="hidden" name="status" value="live" />
          <IconSubmit title="Начать матч">▶ Начать</IconSubmit>
        </form>
      </div>
    </div>
  );
}
