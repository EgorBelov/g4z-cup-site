import Link from "next/link";
import { MatchStatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/format/date";
import { cn } from "@/lib/utils/cn";
import type { BracketSide, MatchDetails } from "@/lib/types/database";

/**
 * Bracket rendered from the stored round/bracket coordinates and the
 * winner/loser links — no guessing from round names.
 */

function BracketMatch({ match, timeZone }: { match: MatchDetails; timeZone: string }) {
  const showScore = match.status === "live" || match.status === "finished";

  const side = (
    name: string | null,
    fallback: string | null,
    score: number,
    teamId: number | null,
  ) => (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-control border px-3 py-2 text-sm",
        match.winner_id !== null && match.winner_id === teamId
          ? "border-accent/40 bg-accent-soft font-semibold"
          : "border-edge bg-surface-sunken/60",
      )}
    >
      <span className={cn("truncate", !name && "italic text-ink-faint")}>
        {name ?? fallback ?? "TBD"}
      </span>
      <span className="shrink-0 tabular-nums text-ink-muted">
        {showScore ? score : "—"}
      </span>
    </div>
  );

  return (
    <Link
      href={`/t/${match.tournament_slug}/matches/${match.id}`}
      className={cn(
        "block rounded-card border p-3 transition hover:border-accent/40",
        match.status === "live"
          ? "border-live/40 bg-live-soft/30"
          : "border-edge bg-panel",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-ink-faint">
        <span className="truncate">{match.round_label ?? `Раунд ${match.round}`}</span>
        <MatchStatusBadge status={match.status} />
      </div>

      <div className="space-y-1.5">
        {side(match.team1_name, match.team1_source, match.score1, match.team1_id)}
        {side(match.team2_name, match.team2_source, match.score2, match.team2_id)}
      </div>

      <p className="mt-2 text-[11px] text-ink-faint">
        bo{match.best_of} · {formatDateTime(match.scheduled_at, timeZone)}
      </p>
    </Link>
  );
}

function BracketColumns({
  matches,
  timeZone,
}: {
  matches: MatchDetails[];
  timeZone: string;
}) {
  const rounds = [...new Set(matches.map((match) => match.round))].sort(
    (a, b) => a - b,
  );

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-4">
        {rounds.map((round) => {
          const roundMatches = matches
            .filter((match) => match.round === round)
            .sort((a, b) => a.position - b.position);

          return (
            <div key={round} className="w-64 shrink-0 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                {roundMatches[0]?.round_label ?? `Раунд ${round}`}
              </p>
              {roundMatches.map((match) => (
                <BracketMatch key={match.id} match={match} timeZone={timeZone} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const sectionTitles: Record<BracketSide | "none", string> = {
  upper: "Верхняя сетка",
  lower: "Нижняя сетка",
  final: "Финалы",
  none: "Плей-офф",
};

export function BracketView({
  matches,
  timeZone,
}: {
  matches: MatchDetails[];
  timeZone: string;
}) {
  if (matches.length === 0) {
    return (
      <EmptyState
        title="Сетка ещё не построена"
        hint="Плей-офф появится здесь, как только организаторы сгенерируют сетку."
      />
    );
  }

  const sides: (BracketSide | "none")[] = ["upper", "lower", "final"];
  const grouped = sides
    .map((side) => ({
      side,
      matches: matches.filter((match) => match.bracket === side),
    }))
    .filter((group) => group.matches.length > 0);

  const unassigned = matches.filter((match) => match.bracket === null);
  if (unassigned.length > 0) {
    grouped.push({ side: "none", matches: unassigned });
  }

  return (
    <div className="space-y-8">
      {grouped.map((group) => (
        <section key={group.side}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-accent">
            {sectionTitles[group.side]}
          </h3>
          <BracketColumns matches={group.matches} timeZone={timeZone} />
        </section>
      ))}
    </div>
  );
}
