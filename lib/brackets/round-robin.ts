import { BracketError, type GeneratedMatch } from "@/lib/brackets/types";

/**
 * Round robin schedule via the circle method: every team plays every other one
 * exactly once, spread over `n - 1` rounds so nobody plays twice in a round.
 *
 * With an odd number of teams a virtual bye is added, which is why one team
 * rests each round — exactly how G4Z CUP 10's seven-team group ran.
 */
export function generateRoundRobin(
  teamCount: number,
  bestOf: number,
): GeneratedMatch[] {
  if (teamCount < 2) {
    throw new BracketError("Для круговой системы нужно минимум 2 команды");
  }

  const hasBye = teamCount % 2 === 1;
  const size = hasBye ? teamCount + 1 : teamCount;
  const BYE = -1;

  // Seeds 1..teamCount, plus the bye placeholder.
  let wheel: number[] = Array.from({ length: size }, (_, i) =>
    i < teamCount ? i + 1 : BYE,
  );

  const matches: GeneratedMatch[] = [];

  for (let round = 1; round <= size - 1; round += 1) {
    let position = 1;

    for (let i = 0; i < size / 2; i += 1) {
      const home = wheel[i]!;
      const away = wheel[size - 1 - i]!;

      if (home === BYE || away === BYE) continue;

      // Alternate sides between rounds so the same team is not always first.
      const flip = round % 2 === 0;
      const first = flip ? away : home;
      const second = flip ? home : away;

      matches.push({
        index: matches.length,
        round,
        position,
        bracket: null,
        label: `Round ${round}`,
        bestOf,
        slot1: { kind: "seed", seed: first },
        slot2: { kind: "seed", seed: second },
        winnerTo: null,
        loserTo: null,
      });

      position += 1;
    }

    // Rotate everything but the first element.
    wheel = [wheel[0]!, wheel[size - 1]!, ...wheel.slice(1, size - 1)];
  }

  return matches;
}

/** Total matches a round robin of `teamCount` teams produces. */
export function roundRobinMatchCount(teamCount: number): number {
  return (teamCount * (teamCount - 1)) / 2;
}
