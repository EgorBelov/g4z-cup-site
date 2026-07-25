import {
  BracketError,
  type GeneratedMatch,
  type SlotSource,
} from "@/lib/brackets/types";

/** Smallest power of two that fits `n`. */
export function bracketSize(n: number): number {
  let size = 1;
  while (size < n) size *= 2;
  return size;
}

/**
 * Classic seeding order: 1 meets the lowest seed, and the top seeds can only
 * meet in the final. For size 8 → [1, 8, 4, 5, 2, 7, 3, 6].
 */
export function seedOrder(size: number): number[] {
  let order = [1];

  while (order.length < size) {
    const round = order.length * 2;
    const next: number[] = [];
    for (const seed of order) {
      next.push(seed, round + 1 - seed);
    }
    order = next;
  }

  return order;
}

/** "Финал" / "Полуфинал" / … counted back from the last round. */
export function roundLabel(roundsFromEnd: number): string {
  switch (roundsFromEnd) {
    case 0:
      return "Финал";
    case 1:
      return "Полуфинал";
    case 2:
      return "Четвертьфинал";
    default:
      return `1/${2 ** (roundsFromEnd + 1)} финала`;
  }
}

type Builder = {
  matches: GeneratedMatch[];
  add: (match: Omit<GeneratedMatch, "index">) => number;
  link: (from: number, which: "winnerTo" | "loserTo", to: number, slot: 1 | 2) => void;
};

function createBuilder(): Builder {
  const matches: GeneratedMatch[] = [];

  return {
    matches,
    add(match) {
      const index = matches.length;
      matches.push({ ...match, index });
      return index;
    },
    link(from, which, to, slot) {
      const source = matches[from];
      if (!source) throw new BracketError(`Нет матча с индексом ${from}`);
      source[which] = { match: to, slot };

      const target = matches[to];
      if (!target) throw new BracketError(`Нет матча с индексом ${to}`);
      const ref: SlotSource =
        which === "winnerTo"
          ? { kind: "winner", match: from }
          : { kind: "loser", match: from };
      if (slot === 1) target.slot1 = ref;
      else target.slot2 = ref;
    },
  };
}

/**
 * Single elimination.
 *
 * Teams beyond the bracket size get byes: the first-round match is not created
 * at all and the entrant is placed straight into round two, so no organiser has
 * to click through a fake match.
 */
export function generateSingleElimination(
  teamCount: number,
  bestOf: number,
  options: { thirdPlace?: boolean; finalBestOf?: number } = {},
): GeneratedMatch[] {
  if (teamCount < 2) {
    throw new BracketError("Для плей-офф нужно минимум 2 команды");
  }

  const size = bracketSize(teamCount);
  const totalRounds = Math.log2(size);
  const order = seedOrder(size);
  const builder = createBuilder();

  // matchIndexByRound[r][p] — index of match p in round r+1, or null when the
  // slot was resolved by a bye.
  const grid: (number | null)[][] = [];
  // Slot content for round 1, before pruning byes.
  const roundOnePairs: [number, number][] = [];

  for (let p = 0; p < size / 2; p += 1) {
    roundOnePairs.push([order[p * 2]!, order[p * 2 + 1]!]);
  }

  // Round 1, byes pruned.
  const firstRound: (number | null)[] = [];
  const byeTeams = new Map<number, number>(); // position -> seed advancing free

  roundOnePairs.forEach(([a, b], position) => {
    const aReal = a <= teamCount;
    const bReal = b <= teamCount;

    if (aReal && bReal) {
      firstRound.push(
        builder.add({
          round: 1,
          position: position + 1,
          bracket: totalRounds === 1 ? "final" : "upper",
          label: totalRounds === 1 ? "Финал" : roundLabel(totalRounds - 1),
          bestOf: totalRounds === 1 ? (options.finalBestOf ?? bestOf) : bestOf,
          slot1: { kind: "seed", seed: a },
          slot2: { kind: "seed", seed: b },
          winnerTo: null,
          loserTo: null,
        }),
      );
      return;
    }

    firstRound.push(null);
    if (aReal) byeTeams.set(position, a);
    else if (bReal) byeTeams.set(position, b);
  });

  grid.push(firstRound);

  for (let round = 2; round <= totalRounds; round += 1) {
    const count = size / 2 ** round;
    const isFinal = round === totalRounds;
    const current: (number | null)[] = [];

    for (let position = 0; position < count; position += 1) {
      current.push(
        builder.add({
          round,
          position: position + 1,
          bracket: isFinal ? "final" : "upper",
          label: roundLabel(totalRounds - round),
          bestOf: isFinal ? (options.finalBestOf ?? bestOf) : bestOf,
          slot1: null,
          slot2: null,
          winnerTo: null,
          loserTo: null,
        }),
      );
    }

    grid.push(current);

    // Wire the previous round into this one.
    const previous = grid[round - 2]!;
    previous.forEach((matchIndex, position) => {
      const target = current[Math.floor(position / 2)];
      if (target === null || target === undefined) return;
      const slot: 1 | 2 = position % 2 === 0 ? 1 : 2;

      if (matchIndex !== null) {
        builder.link(matchIndex, "winnerTo", target, slot);
        return;
      }

      // Bye: place the entrant directly (only round 1 can produce these).
      if (round === 2) {
        const seed = byeTeams.get(position);
        const match = builder.matches[target]!;
        const ref: SlotSource | null =
          seed === undefined ? null : { kind: "seed", seed };
        if (slot === 1) match.slot1 = ref;
        else match.slot2 = ref;
      }
    });
  }

  if (options.thirdPlace && totalRounds >= 2) {
    const semis = grid[totalRounds - 2] ?? [];
    const thirdPlace = builder.add({
      round: totalRounds,
      position: 2,
      bracket: "final",
      label: "Матч за 3 место",
      bestOf,
      slot1: null,
      slot2: null,
      winnerTo: null,
      loserTo: null,
    });

    semis.forEach((matchIndex, position) => {
      if (matchIndex === null || position > 1) return;
      builder.link(matchIndex, "loserTo", thirdPlace, position === 0 ? 1 : 2);
    });
  }

  return builder.matches;
}

/**
 * Double elimination: upper bracket, lower bracket, grand final.
 *
 * The lower bracket alternates between consolidation rounds (lower bracket
 * winners meet each other) and drop-in rounds (they meet the freshly eliminated
 * teams from the upper bracket), which is the standard layout.
 */
export function generateDoubleElimination(
  teamCount: number,
  bestOf: number,
  options: { finalBestOf?: number } = {},
): GeneratedMatch[] {
  if (teamCount < 4) {
    throw new BracketError(
      "Для двойного выбывания нужно минимум 4 команды — для меньшего числа используйте single elimination",
    );
  }

  const size = bracketSize(teamCount);
  const upperRounds = Math.log2(size);
  const order = seedOrder(size);
  const builder = createBuilder();

  const upperGrid: (number | null)[][] = [];
  const byeTeams = new Map<number, number>();

  const firstRound: (number | null)[] = [];
  for (let position = 0; position < size / 2; position += 1) {
    const a = order[position * 2]!;
    const b = order[position * 2 + 1]!;
    const aReal = a <= teamCount;
    const bReal = b <= teamCount;

    if (aReal && bReal) {
      firstRound.push(
        builder.add({
          round: 1,
          position: position + 1,
          bracket: "upper",
          label: "Верхняя сетка, раунд 1",
          bestOf,
          slot1: { kind: "seed", seed: a },
          slot2: { kind: "seed", seed: b },
          winnerTo: null,
          loserTo: null,
        }),
      );
    } else {
      firstRound.push(null);
      if (aReal) byeTeams.set(position, a);
      else if (bReal) byeTeams.set(position, b);
    }
  }
  upperGrid.push(firstRound);

  for (let round = 2; round <= upperRounds; round += 1) {
    const count = size / 2 ** round;
    const current: (number | null)[] = [];

    for (let position = 0; position < count; position += 1) {
      current.push(
        builder.add({
          round,
          position: position + 1,
          bracket: "upper",
          label:
            round === upperRounds
              ? "Финал верхней сетки"
              : `Верхняя сетка, раунд ${round}`,
          bestOf,
          slot1: null,
          slot2: null,
          winnerTo: null,
          loserTo: null,
        }),
      );
    }

    upperGrid.push(current);

    const previous = upperGrid[round - 2]!;
    previous.forEach((matchIndex, position) => {
      const target = current[Math.floor(position / 2)];
      if (target === undefined || target === null) return;
      const slot: 1 | 2 = position % 2 === 0 ? 1 : 2;

      if (matchIndex !== null) {
        builder.link(matchIndex, "winnerTo", target, slot);
      } else if (round === 2) {
        const seed = byeTeams.get(position);
        if (seed !== undefined) {
          const match = builder.matches[target]!;
          if (slot === 1) match.slot1 = { kind: "seed", seed };
          else match.slot2 = { kind: "seed", seed };
        }
      }
    });
  }

  // ─── lower bracket ────────────────────────────────────────────────────────

  type Feeder =
    | { kind: "loserOf"; match: number }
    | { kind: "winnerOf"; match: number };

  let lowerRound = 0;

  /** Pairs feeders against each other; an odd one out advances untouched. */
  function consolidate(feeders: Feeder[], label: string): Feeder[] {
    if (feeders.length < 2) return feeders;

    lowerRound += 1;
    const next: Feeder[] = [];

    for (let i = 0; i + 1 < feeders.length; i += 2) {
      const created = builder.add({
        round: lowerRound,
        position: next.length + 1,
        bracket: "lower",
        label,
        bestOf,
        slot1: null,
        slot2: null,
        winnerTo: null,
        loserTo: null,
      });

      attach(feeders[i]!, created, 1);
      attach(feeders[i + 1]!, created, 2);
      next.push({ kind: "winnerOf", match: created });
    }

    if (feeders.length % 2 === 1) {
      next.push(feeders[feeders.length - 1]!);
    }

    return next;
  }

  /** Pairs lower-bracket survivors against teams dropping from above. */
  function dropIn(survivors: Feeder[], dropped: Feeder[], label: string): Feeder[] {
    if (dropped.length === 0) return survivors;

    lowerRound += 1;
    const next: Feeder[] = [];
    // Reverse the drop-ins so the freshest eliminations do not immediately
    // rematch the team that just beat them.
    const incoming = [...dropped].reverse();
    const pairs = Math.min(survivors.length, incoming.length);

    for (let i = 0; i < pairs; i += 1) {
      const created = builder.add({
        round: lowerRound,
        position: next.length + 1,
        bracket: "lower",
        label,
        bestOf,
        slot1: null,
        slot2: null,
        winnerTo: null,
        loserTo: null,
      });

      attach(survivors[i]!, created, 1);
      attach(incoming[i]!, created, 2);
      next.push({ kind: "winnerOf", match: created });
    }

    next.push(...survivors.slice(pairs), ...incoming.slice(pairs));
    return next;
  }

  function attach(feeder: Feeder, target: number, slot: 1 | 2): void {
    builder.link(
      feeder.match,
      feeder.kind === "loserOf" ? "loserTo" : "winnerTo",
      target,
      slot,
    );
  }

  const upperRoundOneLosers: Feeder[] = (upperGrid[0] ?? [])
    .filter((index): index is number => index !== null)
    .map((index) => ({ kind: "loserOf", match: index }));

  let survivors = consolidate(upperRoundOneLosers, "Нижняя сетка, раунд 1");

  for (let round = 2; round <= upperRounds; round += 1) {
    const dropped: Feeder[] = (upperGrid[round - 1] ?? [])
      .filter((index): index is number => index !== null)
      .map((index) => ({ kind: "loserOf", match: index }));

    survivors = dropIn(
      survivors,
      dropped,
      round === upperRounds
        ? "Финал нижней сетки"
        : `Нижняя сетка, раунд ${lowerRound + 1}`,
    );

    if (survivors.length > 1) {
      survivors = consolidate(survivors, `Нижняя сетка, раунд ${lowerRound + 1}`);
    }
  }

  const upperFinal = upperGrid[upperRounds - 1]?.[0];
  if (upperFinal === undefined || upperFinal === null) {
    throw new BracketError("Не удалось построить финал верхней сетки");
  }

  const lowerFinal = survivors[0];
  if (!lowerFinal) {
    throw new BracketError("Не удалось построить финал нижней сетки");
  }

  const grandFinal = builder.add({
    round: upperRounds + 1,
    position: 1,
    bracket: "final",
    label: "Гранд-финал",
    bestOf: options.finalBestOf ?? bestOf,
    slot1: null,
    slot2: null,
    winnerTo: null,
    loserTo: null,
  });

  builder.link(upperFinal, "winnerTo", grandFinal, 1);
  attach(lowerFinal, grandFinal, 2);

  return builder.matches;
}
