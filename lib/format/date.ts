/**
 * Date formatting.
 *
 * All output is rendered in the tournament's time zone (Moscow by default) with
 * an explicit `timeZone`, so a viewer in another region sees the same schedule
 * the organisers announced. Nothing here reads the current time, which keeps it
 * safe to call inside `use cache` scopes.
 */

export const DEFAULT_TIME_ZONE = "Europe/Moscow";

function formatter(
  options: Intl.DateTimeFormatOptions,
  timeZone: string,
): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("ru-RU", { ...options, timeZone });
}

export function formatTime(value: string | null, timeZone = DEFAULT_TIME_ZONE): string {
  if (!value) return "—";
  return formatter({ hour: "2-digit", minute: "2-digit" }, timeZone).format(
    new Date(value),
  );
}

export function formatDateTime(
  value: string | null,
  timeZone = DEFAULT_TIME_ZONE,
): string {
  if (!value) return "Время уточняется";
  return formatter(
    { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" },
    timeZone,
  ).format(new Date(value));
}

export function formatDayLabel(
  value: string | null,
  timeZone = DEFAULT_TIME_ZONE,
): string {
  if (!value) return "Дата уточняется";
  return formatter({ weekday: "long", day: "numeric", month: "long" }, timeZone).format(
    new Date(value),
  );
}

export function formatDateRange(
  from: string | null,
  to: string | null,
  timeZone = DEFAULT_TIME_ZONE,
): string | null {
  if (!from) return null;

  const short = formatter({ day: "numeric", month: "long" }, timeZone);
  const withYear = formatter(
    { day: "numeric", month: "long", year: "numeric" },
    timeZone,
  );

  if (!to) return withYear.format(new Date(from));
  return `${short.format(new Date(from))} — ${withYear.format(new Date(to))}`;
}

/**
 * "3 — 7 августа" from two plain `date` values.
 *
 * A stage window is a pair of calendar days, not instants, so nothing here goes
 * through a time zone: `new Date("2026-08-03")` is UTC midnight and would slide
 * to the previous day for any viewer west of Greenwich.
 */
export function formatDayRange(from: string | null, to: string | null): string | null {
  const start = parseDay(from);
  if (!start) return null;

  const end = parseDay(to);
  const short = new Intl.DateTimeFormat("ru-RU", { day: "numeric" });
  const full = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });

  if (!end || (end.day === start.day && end.month === start.month)) {
    return full.format(start.date);
  }

  // "3 — 7 августа" inside one month, "30 июля — 2 августа" across two.
  const head = end.month === start.month ? short : full;
  return `${head.format(start.date)} — ${full.format(end.date)}`;
}

function parseDay(
  value: string | null,
): { date: Date; day: number; month: number } | null {
  if (!value) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match.map(Number) as [number, number, number, number];
  // Local noon: far enough from either midnight that no formatter rounds a day off.
  return { date: new Date(year, month - 1, day, 12), day, month };
}

/** Stable YYYY-MM-DD key in the tournament time zone, for grouping by day. */
export function dayKey(value: string, timeZone = DEFAULT_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(new Date(value));

  return parts;
}

/** `datetime-local` input value, in the tournament time zone. */
export function toDateTimeLocal(
  value: string | null,
  timeZone = DEFAULT_TIME_ZONE,
): string {
  if (!value) return "";

  const parts = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  })
    .format(new Date(value))
    .replace(" ", "T");

  return parts;
}

/**
 * Reads a `datetime-local` value as wall-clock time in `timeZone` and returns
 * the UTC instant. Without this the server's own zone would silently shift
 * every match by a few hours — the exact bug the v1 admin panel had.
 */
export function fromDateTimeLocal(
  value: string,
  timeZone = DEFAULT_TIME_ZONE,
): string | null {
  if (!value) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match.map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];

  // Start from the naive UTC reading, then correct by the zone's offset at that
  // instant (handles DST for zones that observe it).
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  const offset = zoneOffsetMs(new Date(naive), timeZone);
  const corrected = new Date(naive - offset);

  // Re-check: near a DST boundary the offset can differ once shifted.
  const secondOffset = zoneOffsetMs(corrected, timeZone);
  if (secondOffset !== offset) {
    return new Date(naive - secondOffset).toISOString();
  }

  return corrected.toISOString();
}

function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const lookup: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") lookup[part.type] = Number(part.value);
  }

  const asUtc = Date.UTC(
    lookup.year ?? 1970,
    (lookup.month ?? 1) - 1,
    lookup.day ?? 1,
    lookup.hour === 24 ? 0 : (lookup.hour ?? 0),
    lookup.minute ?? 0,
    lookup.second ?? 0,
  );

  return asUtc - date.getTime();
}

export function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
