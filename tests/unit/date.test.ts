import { describe, expect, it } from "vitest";
import {
  dayKey,
  formatDateTime,
  formatDayRange,
  formatDuration,
  fromDateTimeLocal,
  toDateTimeLocal,
} from "@/lib/format/date";

describe("timezone handling", () => {
  it("reads a datetime-local value as Moscow wall clock", () => {
    // 14:00 Moscow is 11:00 UTC — the v1 admin panel used the server's zone and
    // silently shifted every match.
    expect(fromDateTimeLocal("2026-04-04T14:00", "Europe/Moscow")).toBe(
      "2026-04-04T11:00:00.000Z",
    );
  });

  it("round-trips through the input format", () => {
    const iso = "2026-04-04T11:00:00.000Z";
    const local = toDateTimeLocal(iso, "Europe/Moscow");

    expect(local).toBe("2026-04-04T14:00");
    expect(fromDateTimeLocal(local, "Europe/Moscow")).toBe(iso);
  });

  it("handles a zone with daylight saving", () => {
    // Berlin is UTC+2 in July.
    expect(fromDateTimeLocal("2026-07-15T12:00", "Europe/Berlin")).toBe(
      "2026-07-15T10:00:00.000Z",
    );
    // …and UTC+1 in January.
    expect(fromDateTimeLocal("2026-01-15T12:00", "Europe/Berlin")).toBe(
      "2026-01-15T11:00:00.000Z",
    );
  });

  it("returns null for empty or broken input", () => {
    expect(fromDateTimeLocal("")).toBeNull();
    expect(fromDateTimeLocal("not-a-date")).toBeNull();
    expect(toDateTimeLocal(null)).toBe("");
  });

  it("groups by tournament-local day, not UTC day", () => {
    // 00:30 Moscow on 5 April is still 21:30 UTC on 4 April.
    expect(dayKey("2026-04-04T21:30:00.000Z", "Europe/Moscow")).toBe("2026-04-05");
  });

  it("formats times in the tournament zone", () => {
    expect(formatDateTime("2026-04-04T11:00:00.000Z", "Europe/Moscow")).toContain(
      "14:00",
    );
  });
});

describe("formatDayRange", () => {
  it("names the month once inside a single month", () => {
    expect(formatDayRange("2026-08-03", "2026-08-07")).toBe("3 — 7 августа");
  });

  it("names both months when the stage spans two", () => {
    expect(formatDayRange("2026-07-30", "2026-08-02")).toBe("30 июля — 2 августа");
  });

  it("collapses a one-day stage", () => {
    expect(formatDayRange("2026-08-07", "2026-08-07")).toBe("7 августа");
    expect(formatDayRange("2026-08-07", null)).toBe("7 августа");
  });

  it("returns null without a start", () => {
    expect(formatDayRange(null, "2026-08-07")).toBeNull();
  });
});

describe("formatDuration", () => {
  it("renders minutes and seconds", () => {
    expect(formatDuration(2100)).toBe("35:00");
    expect(formatDuration(2135)).toBe("35:35");
  });

  it("returns null when unknown", () => {
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(0)).toBeNull();
  });
});
