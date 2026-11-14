import { describe, expect, it } from "vitest";
import { EMBLEMS, EMBLEM_COUNT, emblemFor, emblemIndexFor } from "@/lib/team-mark";

describe("team emblem assignment", () => {
  it("is deterministic for the same slug", () => {
    expect(emblemFor("g4ziki")).toEqual(emblemFor("g4ziki"));
    expect(emblemFor("g4ziki").id).toBe(emblemFor("g4ziki").id);
  });

  it("ignores the case of the slug", () => {
    expect(emblemFor("G4ZIKI")).toEqual(emblemFor("g4ziki"));
  });

  it("has unique ids and a non-empty path for every emblem", () => {
    const ids = new Set(EMBLEMS.map((emblem) => emblem.id));
    expect(ids.size).toBe(EMBLEM_COUNT);
    expect(EMBLEM_COUNT).toBeGreaterThanOrEqual(24);

    for (const emblem of EMBLEMS) {
      expect(emblem.label.length).toBeGreaterThan(0);
      expect(emblem.path.startsWith("M")).toBe(true);
      expect(emblem.path.length).toBeGreaterThan(15);
    }
  });

  it("maps every slug to an emblem inside the set", () => {
    for (const slug of ["g4ziki", "rehub", "bloody-valentine", "team-404"]) {
      const index = emblemIndexFor(slug);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(EMBLEM_COUNT);
      expect(emblemFor(slug).id).toBe(EMBLEMS[index]!.id);
    }
  });

  it("spreads emblems across a field of teams", () => {
    const slugs = Array.from({ length: 60 }, (_, index) => `team-${index + 1}`);
    const used = new Set(slugs.map((slug) => emblemFor(slug).id));
    // 60 draws over ~28 glyphs: a healthy spread, not a handful of repeats.
    expect(used.size).toBeGreaterThanOrEqual(18);
  });
});
