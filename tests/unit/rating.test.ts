import { describe, expect, it } from "vitest";
import { formatRating, tournamentRatingLabel } from "@/lib/format/rating";

// ru-RU groups thousands with a non-breaking space; normalise it for assertions.
const plain = (value: string) => value.replace(/\u00a0/g, " ");

describe("tournament rating label", () => {
  it("keeps the old wording while nothing is announced", () => {
    expect(tournamentRatingLabel({ rating_team: null, rating_player: null })).toBe(
      "не обязателен",
    );
  });

  it("shows only the announced figure", () => {
    expect(
      plain(tournamentRatingLabel({ rating_team: 30000, rating_player: null })),
    ).toBe("30 000 на команду");
    expect(
      plain(tournamentRatingLabel({ rating_team: null, rating_player: 7000 })),
    ).toBe("7 000 на игрока");
  });

  it("shows both figures in one line", () => {
    expect(
      plain(tournamentRatingLabel({ rating_team: 30000, rating_player: 7000 })),
    ).toBe("30 000 на команду · 7 000 на игрока");
  });

  it("formats a plain number without a sign or decimals", () => {
    expect(plain(formatRating(7000))).toBe("7 000");
    expect(formatRating(0)).not.toContain(".");
  });
});
