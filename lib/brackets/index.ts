import type { GeneratedMatch, ScheduleOptions, SlotSource } from "@/lib/brackets/types";

export { BracketError } from "@/lib/brackets/types";
export type { GeneratedMatch, ScheduleOptions, SlotSource } from "@/lib/brackets/types";
export { generateRoundRobin, roundRobinMatchCount } from "@/lib/brackets/round-robin";
export {
  bracketSize,
  generateDoubleElimination,
  generateSingleElimination,
  roundLabel,
  seedOrder,
} from "@/lib/brackets/elimination";
export {
  pairKey,
  pairSwissRound,
  suggestedSwissRounds,
  type SwissEntry,
  type SwissPairing,
} from "@/lib/brackets/swiss";

/**
 * Kickoff time per match: one slot per round, so an organiser gets a usable
 * schedule out of the generator and only has to nudge individual matches.
 */
export function scheduleTimes(
  matches: GeneratedMatch[],
  options: ScheduleOptions,
): (string | null)[] {
  const { startAt, roundGapMinutes = 60 } = options;
  if (!startAt) return matches.map(() => null);

  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);
  const offsetByRound = new Map(
    rounds.map((round, index) => [round, index * roundGapMinutes]),
  );

  return matches.map((match) => {
    const offset = offsetByRound.get(match.round) ?? 0;
    return new Date(startAt.getTime() + offset * 60_000).toISOString();
  });
}

/**
 * Human placeholder for an empty slot, shown until the feeding match resolves.
 */
export function describeSlot(
  slot: SlotSource | null,
  matches: GeneratedMatch[],
  seedNames: (seed: number) => string | null,
): string | null {
  if (!slot) return null;

  switch (slot.kind) {
    case "seed":
      return seedNames(slot.seed) ?? `Сеяная ${slot.seed}`;
    case "label":
      return slot.label;
    case "winner": {
      const source = matches[slot.match];
      return source ? `Победитель: ${source.label}` : "Победитель матча";
    }
    case "loser": {
      const source = matches[slot.match];
      return source ? `Проигравший: ${source.label}` : "Проигравший матча";
    }
  }
}
