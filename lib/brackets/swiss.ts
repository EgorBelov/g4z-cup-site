/**
 * Swiss pairing for the next round.
 *
 * Teams are sorted by record, then paired top-down while avoiding rematches.
 * When a clean pairing is impossible the search backtracks, and only if every
 * option is exhausted does it allow a rematch — reported to the caller so the
 * admin sees it.
 */

export type SwissEntry = {
  teamId: number;
  wins: number;
  losses: number;
  mapDiff: number;
};

export type SwissPairing = {
  pairs: { team1: number; team2: number }[];
  /** Team resting this round when the field is odd. */
  bye: number | null;
  /** True when a rematch had to be allowed to complete the round. */
  hasRematch: boolean;
};

export function pairKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function pairSwissRound(
  entries: SwissEntry[],
  played: Set<string>,
): SwissPairing {
  const sorted = [...entries].sort(
    (a, b) =>
      b.wins - a.wins ||
      a.losses - b.losses ||
      b.mapDiff - a.mapDiff ||
      a.teamId - b.teamId,
  );

  // The lowest-ranked team that has not had a bye yet sits out an odd round.
  let bye: number | null = null;
  let pool = sorted;

  if (sorted.length % 2 === 1) {
    const resting = sorted[sorted.length - 1]!;
    bye = resting.teamId;
    pool = sorted.slice(0, -1);
  }

  const search = (
    remaining: SwissEntry[],
    allowRematch: boolean,
  ): { team1: number; team2: number }[] | null => {
    if (remaining.length === 0) return [];

    const [first, ...rest] = remaining;
    if (!first) return [];

    for (let i = 0; i < rest.length; i += 1) {
      const candidate = rest[i]!;
      const isRematch = played.has(pairKey(first.teamId, candidate.teamId));
      if (isRematch && !allowRematch) continue;

      const tail = search(
        rest.filter((_, index) => index !== i),
        allowRematch,
      );

      if (tail) {
        return [{ team1: first.teamId, team2: candidate.teamId }, ...tail];
      }
    }

    return null;
  };

  const clean = search(pool, false);
  if (clean) {
    return { pairs: clean, bye, hasRematch: false };
  }

  const fallback = search(pool, true) ?? [];
  return { pairs: fallback, bye, hasRematch: fallback.length > 0 };
}

/** Number of rounds a Swiss stage normally runs for a given field size. */
export function suggestedSwissRounds(teamCount: number): number {
  if (teamCount < 2) return 0;
  return Math.max(1, Math.ceil(Math.log2(teamCount)));
}
