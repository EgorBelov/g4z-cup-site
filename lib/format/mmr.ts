import type { Player } from "@/lib/types/database";

/**
 * MMR is self-reported and optional, so every reader has to cope with a roster
 * where only some of the players declared one.
 */

/** "5 700" — a thin space keeps the number readable next to a nickname. */
export function formatMmr(mmr: number | null | undefined): string | null {
  if (mmr === null || mmr === undefined) return null;
  return mmr.toLocaleString("ru-RU").replace(/ /g, " ");
}

/** Average over the players who declared an MMR, or null if none did. */
export function averageMmr(players: Pick<Player, "mmr">[]): number | null {
  const values = players
    .map((player) => player.mmr)
    .filter((mmr): mmr is number => typeof mmr === "number");

  if (values.length === 0) return null;

  return Math.round(values.reduce((sum, mmr) => sum + mmr, 0) / values.length);
}
