import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/ui/Icon";
import { MatchStatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/format/date";
import { cn } from "@/lib/utils/cn";
import type { BracketSide, MatchDetails } from "@/lib/types/database";

/**
 * Bracket rendered from the stored round/bracket coordinates and the
 * winner/loser links — no guessing from round names.
 */

function BracketMatch({
  match,
  timeZone,
  showLabel = true,
}: {
  match: MatchDetails;
  timeZone: string;
  showLabel?: boolean;
}) {
  const showScore = match.status === "live" || match.status === "finished";

  const side = (
    name: string | null,
    fallback: string | null,
    score: number,
    teamId: number | null,
    logo: string | null,
  ) => (
    <div
      className={cn(
        "orbit-bracket-team flex min-w-0 items-center justify-between gap-3 border-b px-1 py-3 text-sm",
        match.winner_id !== null && match.winner_id === teamId
          ? "border-edge text-accent"
          : "border-edge text-ink-muted",
      )}
      data-winner={match.winner_id !== null && match.winner_id === teamId}
    >
      <span>
        <span className="orbit-bracket-logo" aria-hidden="true">
          {logo ? (
            <Image src={logo} alt="" width={27} height={27} unoptimized />
          ) : name ? (
            name
              .replace(/^Team\s+/i, "")
              .slice(0, 2)
              .toUpperCase()
          ) : (
            "?"
          )}
        </span>
        <span className={cn("truncate", !name && "italic text-ink-faint")}>
          {name ?? fallback ?? "TBD"}
        </span>
      </span>
      <span className="orbit-bracket-score shrink-0 tabular-nums text-ink-muted">
        {showScore ? score : "—"}
      </span>
    </div>
  );

  return (
    <Link
      href={`/t/${match.tournament_slug}/matches/${match.id}`}
      className="orbit-bracket-card orbit-frame block"
      data-status={match.status}
    >
      <div
        className={cn(
          "mb-2 flex flex-wrap items-center gap-2 text-xs text-ink-faint",
          showLabel ? "justify-between" : "justify-end",
        )}
      >
        {showLabel ? (
          <span className="truncate">{match.round_label ?? `Раунд ${match.round}`}</span>
        ) : null}
        <MatchStatusBadge status={match.status} />
      </div>

      <div className="space-y-1.5">
        {side(
          match.team1_name,
          match.team1_source,
          match.score1,
          match.team1_id,
          match.team1_logo,
        )}
        {side(
          match.team2_name,
          match.team2_source,
          match.score2,
          match.team2_id,
          match.team2_logo,
        )}
      </div>

      <p className="orbit-bracket-meta mt-2 text-xs text-ink-faint">
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
  // Presentation coordinates only. Match progression stays in the database.
  const columns = rounds.map((round) =>
    matches
      .filter((match) => match.round === round)
      .sort((a, b) => a.position - b.position),
  );
  const height = Math.max(1, ...columns.map((column) => column.length)) * 168;
  const coordinates = new Map<number, { x: number; y: number }>();
  columns.forEach((column, index) =>
    column.forEach((match, row) =>
      coordinates.set(match.id, {
        x: index * 316,
        y: ((row + 0.5) * height) / column.length,
      }),
    ),
  );
  const edges = matches.flatMap((match) =>
    [match.winner_to_match_id, match.loser_to_match_id].flatMap((target) => {
      const from = coordinates.get(match.id),
        to = target === null ? undefined : coordinates.get(target);
      if (!from || !to || to.x <= from.x) return [];
      const start = from.x + 260,
        bend = start + (to.x - start) / 2;
      return [`M${start},${from.y}H${bend}V${to.y}H${to.x}`];
    }),
  );
  const lastColumn = columns.at(-1);
  const terminal =
    lastColumn?.length === 1 && lastColumn[0]?.winner_to_match_id === null
      ? lastColumn[0]
      : null;
  const winnerX = rounds.length * 316;
  const boardWidth = terminal ? winnerX + 190 : rounds.length * 316 - 56;
  const terminalPoint = terminal ? coordinates.get(terminal.id) : undefined;

  return (
    <div
      className="orbit-bracket-scroll min-w-0"
      tabIndex={0}
      role="region"
      aria-label="Сетка плей-офф. На узком экране прокрутите по горизонтали."
    >
      <div className="orbit-bracket-board" style={{ minWidth: boardWidth }}>
        <svg
          className="orbit-bracket-connections"
          style={{ width: boardWidth, height }}
          aria-hidden="true"
        >
          {edges.map((edge, index) => (
            <path key={index} d={edge} />
          ))}
          {terminalPoint ? (
            <path d={`M${terminalPoint.x + 260},${terminalPoint.y}H${winnerX}`} />
          ) : null}
        </svg>
        <div className="orbit-bracket-rounds">
          {rounds.map((round) => {
            const roundMatches = matches
              .filter((match) => match.round === round)
              .sort((a, b) => a.position - b.position);

            return (
              <div key={round} className="orbit-bracket-column">
                <p className="eyebrow">
                  {roundMatches[0]?.round_label ?? `Раунд ${round}`}
                </p>
                <div className="orbit-bracket-cells" style={{ height }}>
                  {roundMatches.map((match) => (
                    <div
                      className="orbit-bracket-cell"
                      key={match.id}
                      style={{ top: (coordinates.get(match.id)?.y ?? 0) - 64 }}
                    >
                      <BracketMatch match={match} timeZone={timeZone} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {terminal ? (
            <div className="orbit-bracket-winner">
              <p>Победитель</p>
              <div style={{ height, position: "relative" }}>
                <div
                  className="orbit-bracket-winner-card orbit-frame"
                  style={{ top: (terminalPoint?.y ?? height / 2) - 50 }}
                >
                  <Icon name="trophy" />
                  <span>
                    {terminal.status === "finished" && terminal.winner_id !== null
                      ? terminal.winner_name || "Победитель определён"
                      : "Ожидаем чемпиона"}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
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
  const stageIds = [...new Set(matches.map((match) => match.stage_id))];
  if (stageIds.length > 1) {
    return (
      <div className="space-y-12">
        {stageIds.map((id) => {
          const stageMatches = matches.filter((match) => match.stage_id === id);
          return (
            <section key={id}>
              <h2 className="section-title mb-7">{stageMatches[0]?.stage_name}</h2>
              <BracketView matches={stageMatches} timeZone={timeZone} />
            </section>
          );
        })}
      </div>
    );
  }
  if (matches.length === 0) {
    return (
      <EmptyState
        title="Сетка ещё не построена"
        hint="Плей-офф появится здесь, как только организаторы сгенерируют сетку."
      />
    );
  }

  // Without a lower bracket the "upper / final" split is meaningless — a single
  // elimination reads as one left-to-right run of rounds.
  if (!matches.some((match) => match.bracket === "lower")) {
    // Presentation split follows loser links, never round names or guessed seeds.
    const loserTargets = new Set(
      matches.flatMap((match) =>
        match.loser_to_match_id === null ? [] : [match.loser_to_match_id],
      ),
    );
    const winnerTargets = new Set(
      matches.flatMap((match) =>
        match.winner_to_match_id === null ? [] : [match.winner_to_match_id],
      ),
    );
    const placementMatches = matches.filter(
      (match) =>
        loserTargets.has(match.id) &&
        !winnerTargets.has(match.id) &&
        match.winner_to_match_id === null,
    );
    const placementIds = new Set(placementMatches.map((match) => match.id));
    return (
      <>
        <BracketColumns
          matches={matches.filter((match) => !placementIds.has(match.id))}
          timeZone={timeZone}
        />
        {placementMatches.map((match) => (
          <section className="orbit-third-place" key={match.id}>
            <h3>{match.round_label ?? "Матч за место"}</h3>
            <BracketMatch match={match} timeZone={timeZone} showLabel={false} />
          </section>
        ))}
      </>
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
