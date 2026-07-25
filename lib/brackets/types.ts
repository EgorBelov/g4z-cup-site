import type { BracketSide } from "@/lib/types/database";

/**
 * Where a match slot gets its team from.
 *
 *  - `seed`   — a seeded entrant, by 1-based seed number
 *  - `winner` — the winner of another generated match, by array index
 *  - `loser`  — the loser of another generated match, by array index
 *  - `label`  — a human placeholder ("2 место группы A")
 */
export type SlotSource =
  | { kind: "seed"; seed: number }
  | { kind: "winner"; match: number }
  | { kind: "loser"; match: number }
  | { kind: "label"; label: string };

export type GeneratedMatch = {
  /** Index in the generated array. Links refer to these indexes. */
  index: number;
  round: number;
  /** Order inside the round; also drives bracket layout. */
  position: number;
  bracket: BracketSide | null;
  label: string;
  bestOf: number;
  slot1: SlotSource | null;
  slot2: SlotSource | null;
  winnerTo: { match: number; slot: 1 | 2 } | null;
  loserTo: { match: number; slot: 1 | 2 } | null;
};

export type ScheduleOptions = {
  /** First match kickoff. */
  startAt?: Date | null;
  /** Gap between rounds, minutes. Matches inside a round share a time. */
  roundGapMinutes?: number;
};

export class BracketError extends Error {}
