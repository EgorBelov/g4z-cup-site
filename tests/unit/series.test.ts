import { describe, expect, it } from "vitest";
import { bestOfForScore, seriesMapWinners } from "@/lib/results/series";
import { BracketError } from "@/lib/brackets";

describe("bestOfForScore", () => {
  it.each([
    [1, 0, 1],
    [2, 0, 3],
    [2, 1, 3],
    [3, 2, 5],
    [4, 3, 7],
  ])("%i:%i is bo%i", (score1, score2, expected) => {
    expect(bestOfForScore(score1, score2)).toBe(expected);
    expect(bestOfForScore(score2, score1)).toBe(expected);
  });

  it("rejects scores that cannot be a finished series", () => {
    expect(() => bestOfForScore(1, 1)).toThrow(BracketError);
    expect(() => bestOfForScore(0, 0)).toThrow(BracketError);
    expect(() => bestOfForScore(-1, 2)).toThrow(BracketError);
    expect(() => bestOfForScore(5, 0)).toThrow(BracketError);
    expect(() => bestOfForScore(1.5, 0)).toThrow(BracketError);
  });
});

describe("seriesMapWinners", () => {
  it("produces exactly the requested score", () => {
    for (const [score1, score2] of [
      [1, 0],
      [2, 0],
      [2, 1],
      [3, 0],
      [3, 1],
      [3, 2],
      [0, 2],
      [1, 3],
    ] as const) {
      const maps = seriesMapWinners(score1, score2);

      expect(maps.filter((map) => map === "team1")).toHaveLength(score1);
      expect(maps.filter((map) => map === "team2")).toHaveLength(score2);
      expect(maps).toHaveLength(score1 + score2);
    }
  });

  it("gives the deciding map to the winner", () => {
    expect(seriesMapWinners(2, 1).at(-1)).toBe("team1");
    expect(seriesMapWinners(1, 3).at(-1)).toBe("team2");
  });

  it("interleaves rather than stacking the loser's maps at the end", () => {
    expect(seriesMapWinners(2, 1)).toEqual(["team1", "team2", "team1"]);
    expect(seriesMapWinners(3, 2)).toEqual([
      "team1",
      "team2",
      "team1",
      "team2",
      "team1",
    ]);
  });

  it("handles a sweep", () => {
    expect(seriesMapWinners(3, 0)).toEqual(["team1", "team1", "team1"]);
  });
});
