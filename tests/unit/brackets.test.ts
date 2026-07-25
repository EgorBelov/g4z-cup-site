import { describe, expect, it } from "vitest";
import {
  BracketError,
  bracketSize,
  generateDoubleElimination,
  generateRoundRobin,
  generateSingleElimination,
  pairKey,
  pairSwissRound,
  roundRobinMatchCount,
  scheduleTimes,
  seedOrder,
} from "@/lib/brackets";
import type { GeneratedMatch } from "@/lib/brackets";

function pairsOf(matches: GeneratedMatch[]): string[] {
  return matches.map((match) => {
    const first = match.slot1?.kind === "seed" ? match.slot1.seed : "?";
    const second = match.slot2?.kind === "seed" ? match.slot2.seed : "?";
    return [first, second].sort().join("-");
  });
}

describe("generateRoundRobin", () => {
  it("plays every pair exactly once for an even field", () => {
    const matches = generateRoundRobin(8, 1);

    expect(matches).toHaveLength(roundRobinMatchCount(8));
    expect(new Set(pairsOf(matches)).size).toBe(matches.length);
  });

  it("plays every pair exactly once for an odd field", () => {
    const matches = generateRoundRobin(7, 1);

    expect(matches).toHaveLength(21);
    expect(new Set(pairsOf(matches)).size).toBe(21);
  });

  it("never schedules a team twice in one round", () => {
    const matches = generateRoundRobin(7, 1);
    const rounds = new Map<number, number[]>();

    for (const match of matches) {
      const seeds = [match.slot1, match.slot2].map((slot) =>
        slot?.kind === "seed" ? slot.seed : -1,
      );
      rounds.set(match.round, [...(rounds.get(match.round) ?? []), ...seeds]);
    }

    for (const seeds of rounds.values()) {
      expect(new Set(seeds).size).toBe(seeds.length);
    }
  });

  it("gives an odd field one resting team per round", () => {
    const matches = generateRoundRobin(7, 1);
    const rounds = new Set(matches.map((match) => match.round));

    expect(rounds.size).toBe(7);
    for (const round of rounds) {
      expect(matches.filter((match) => match.round === round)).toHaveLength(3);
    }
  });

  it("rejects a field of one", () => {
    expect(() => generateRoundRobin(1, 1)).toThrow(BracketError);
  });
});

describe("seedOrder", () => {
  it("keeps top seeds apart", () => {
    expect(seedOrder(2)).toEqual([1, 2]);
    expect(seedOrder(4)).toEqual([1, 4, 2, 3]);
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });

  it("rounds the field up to a power of two", () => {
    expect(bracketSize(5)).toBe(8);
    expect(bracketSize(8)).toBe(8);
    expect(bracketSize(9)).toBe(16);
  });
});

describe("generateSingleElimination", () => {
  it("builds n-1 matches for a full bracket", () => {
    const matches = generateSingleElimination(8, 3);
    expect(matches).toHaveLength(7);
    expect(matches.filter((match) => match.round === 1)).toHaveLength(4);
    expect(matches.filter((match) => match.bracket === "final")).toHaveLength(1);
  });

  it("links every non-final match into the next round", () => {
    const matches = generateSingleElimination(8, 1);
    const finals = matches.filter((match) => match.winnerTo === null);

    expect(finals).toHaveLength(1);
    expect(finals[0]?.label).toBe("Финал");

    for (const match of matches) {
      if (!match.winnerTo) continue;
      const target = matches[match.winnerTo.match];
      expect(target).toBeDefined();
      expect(target!.round).toBe(match.round + 1);
    }
  });

  it("skips first-round matches for teams with a bye", () => {
    const matches = generateSingleElimination(5, 1);

    // 5 teams in a bracket of 8: only seeds 4-5 and the two lower pairs play.
    expect(matches.filter((match) => match.round === 1)).toHaveLength(1);
    expect(matches).toHaveLength(4);

    const secondRound = matches.filter((match) => match.round === 2);
    const seededDirectly = secondRound.flatMap((match) =>
      [match.slot1, match.slot2].filter((slot) => slot?.kind === "seed"),
    );
    expect(seededDirectly.length).toBeGreaterThan(0);
  });

  it("adds a third place match when asked", () => {
    const matches = generateSingleElimination(4, 1, { thirdPlace: true });
    const third = matches.find((match) => match.label === "Матч за 3 место");

    expect(third).toBeDefined();

    const semis = matches.filter((match) => match.round === 1);
    for (const semi of semis) {
      expect(semi.loserTo?.match).toBe(third!.index);
    }
  });

  it("can give the final a longer series", () => {
    const matches = generateSingleElimination(4, 1, { finalBestOf: 5 });
    const final = matches.find((match) => match.bracket === "final");

    expect(final?.bestOf).toBe(5);
    expect(matches.filter((match) => match.round === 1)[0]?.bestOf).toBe(1);
  });
});

describe("generateDoubleElimination", () => {
  it.each([
    [4, 6],
    [8, 14],
    [16, 30],
  ])("builds 2n-2 matches for %i teams", (teams, expected) => {
    expect(generateDoubleElimination(teams, 3)).toHaveLength(expected);
  });

  it("sends every upper bracket loser into the lower bracket", () => {
    const matches = generateDoubleElimination(8, 1);
    const upper = matches.filter((match) => match.bracket === "upper");

    for (const match of upper) {
      expect(
        match.loserTo,
        `match ${match.label} has no lower bracket link`,
      ).not.toBeNull();
      expect(matches[match.loserTo!.match]?.bracket).toBe("lower");
    }
  });

  it("ends in a grand final fed by both brackets", () => {
    const matches = generateDoubleElimination(8, 1, { finalBestOf: 5 });
    const grandFinal = matches.find((match) => match.label === "Гранд-финал");

    expect(grandFinal).toBeDefined();
    expect(grandFinal!.bestOf).toBe(5);
    expect(grandFinal!.winnerTo).toBeNull();
    expect(grandFinal!.slot1?.kind).toBe("winner");
    expect(grandFinal!.slot2?.kind).toBe("winner");

    const feeders = matches.filter(
      (match) => match.winnerTo?.match === grandFinal!.index,
    );
    expect(feeders.map((match) => match.bracket).sort()).toEqual(["lower", "upper"]);
  });

  it("leaves exactly one match without an outgoing link", () => {
    const matches = generateDoubleElimination(16, 1);
    const dangling = matches.filter((match) => match.winnerTo === null);

    expect(dangling).toHaveLength(1);
    expect(dangling[0]?.bracket).toBe("final");
  });

  it("handles a field that is not a power of two", () => {
    const matches = generateDoubleElimination(7, 1);

    expect(matches).toHaveLength(12);
    expect(matches.filter((match) => match.bracket === "upper")).toHaveLength(6);
  });

  it("refuses fields that are too small", () => {
    expect(() => generateDoubleElimination(3, 1)).toThrow(BracketError);
  });
});

describe("pairSwissRound", () => {
  const entries = [
    { teamId: 1, wins: 2, losses: 0, mapDiff: 2 },
    { teamId: 2, wins: 2, losses: 0, mapDiff: 1 },
    { teamId: 3, wins: 1, losses: 1, mapDiff: 0 },
    { teamId: 4, wins: 1, losses: 1, mapDiff: 0 },
    { teamId: 5, wins: 0, losses: 2, mapDiff: -1 },
    { teamId: 6, wins: 0, losses: 2, mapDiff: -2 },
  ];

  it("pairs teams with similar records", () => {
    const { pairs, hasRematch } = pairSwissRound(entries, new Set());

    expect(pairs).toHaveLength(3);
    expect(hasRematch).toBe(false);
    expect(pairs[0]).toEqual({ team1: 1, team2: 2 });
  });

  it("avoids rematches", () => {
    const played = new Set([pairKey(1, 2), pairKey(3, 4), pairKey(5, 6)]);
    const { pairs, hasRematch } = pairSwissRound(entries, played);

    expect(hasRematch).toBe(false);
    for (const pair of pairs) {
      expect(played.has(pairKey(pair.team1, pair.team2))).toBe(false);
    }
  });

  it("rests the lowest ranked team when the field is odd", () => {
    const { pairs, bye } = pairSwissRound(entries.slice(0, 5), new Set());

    expect(pairs).toHaveLength(2);
    expect(bye).toBe(5);
  });

  it("reports when a rematch was unavoidable", () => {
    const two = entries.slice(0, 2);
    const { pairs, hasRematch } = pairSwissRound(two, new Set([pairKey(1, 2)]));

    expect(pairs).toHaveLength(1);
    expect(hasRematch).toBe(true);
  });
});

describe("scheduleTimes", () => {
  it("gives one slot per round", () => {
    const matches = generateRoundRobin(4, 1);
    const start = new Date("2026-04-04T11:00:00.000Z");
    const times = scheduleTimes(matches, { startAt: start, roundGapMinutes: 30 });

    expect(times).toHaveLength(matches.length);

    const byRound = new Map<number, string>();
    matches.forEach((match, index) => {
      const time = times[index]!;
      const existing = byRound.get(match.round);
      if (existing) expect(time).toBe(existing);
      byRound.set(match.round, time);
    });

    expect(byRound.get(1)).toBe("2026-04-04T11:00:00.000Z");
    expect(byRound.get(2)).toBe("2026-04-04T11:30:00.000Z");
  });

  it("returns nulls without a start time", () => {
    const matches = generateRoundRobin(4, 1);
    expect(scheduleTimes(matches, { startAt: null })).toEqual(matches.map(() => null));
  });
});
