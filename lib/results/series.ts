import { BracketError } from "@/lib/brackets/types";

/**
 * Helpers for entering a series that was played before the site existed.
 *
 * Match scores are always derived from the map rows by `recalc_match`, so
 * recording "2:1" means creating the maps that add up to it. These functions
 * work out the series length and who won which map.
 */

const MAX_WINS = 4; // bo7

/** bo1 for 1 win, bo3 for 2, bo5 for 3, bo7 for 4. */
export function bestOfForScore(score1: number, score2: number): number {
  const wins = Math.max(score1, score2);
  const losses = Math.min(score1, score2);

  if (!Number.isInteger(score1) || !Number.isInteger(score2)) {
    throw new BracketError("Счёт должен быть целым числом");
  }
  if (score1 < 0 || score2 < 0) {
    throw new BracketError("Счёт не может быть отрицательным");
  }
  if (score1 === score2) {
    throw new BracketError("Ничьих не бывает — укажите победителя серии");
  }
  if (wins > MAX_WINS) {
    throw new BracketError(`Слишком длинная серия: максимум ${MAX_WINS} побед (bo7)`);
  }
  if (losses >= wins) {
    throw new BracketError("У победителя должно быть больше побед");
  }

  return wins * 2 - 1;
}

/**
 * Plausible map-by-map order for a finished series: the loser's maps are spread
 * through the middle and the winner always takes the last one, because a series
 * cannot continue after it is decided.
 */
export function seriesMapWinners(
  score1: number,
  score2: number,
): ("team1" | "team2")[] {
  bestOfForScore(score1, score2);

  const winner: "team1" | "team2" = score1 > score2 ? "team1" : "team2";
  const loser: "team1" | "team2" = winner === "team1" ? "team2" : "team1";
  const winnerMaps = Math.max(score1, score2);
  const loserMaps = Math.min(score1, score2);

  const maps: ("team1" | "team2")[] = [];

  // Alternate while the loser still has maps left, then the winner closes it out.
  let remainingLoser = loserMaps;
  for (let index = 0; index < winnerMaps - 1; index += 1) {
    maps.push(winner);
    if (remainingLoser > 0) {
      maps.push(loser);
      remainingLoser -= 1;
    }
  }

  while (remainingLoser > 0) {
    maps.push(loser);
    remainingLoser -= 1;
  }

  maps.push(winner);
  return maps;
}
