/**
 * Deterministic emblem assignment.
 *
 * The same slug always resolves to the same glyph, on the server and in the
 * browser, so nothing has to be stored. FNV-1a is enough here: the input is a
 * short public slug, and the goal is a stable spread, not a cryptographic hash.
 */
import { EMBLEMS, EMBLEM_COUNT, type Emblem } from "@/lib/team-mark/emblems";

export function emblemIndexFor(slug: string): number {
  let hash = 2166136261;
  for (const char of slug.toLowerCase()) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % EMBLEM_COUNT;
}

export function emblemFor(slug: string): Emblem {
  return EMBLEMS[emblemIndexFor(slug)] ?? EMBLEMS[0]!;
}

export { EMBLEMS, EMBLEM_COUNT } from "@/lib/team-mark/emblems";
export type { Emblem } from "@/lib/team-mark/emblems";
