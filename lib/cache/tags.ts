/**
 * Cache tags.
 *
 * Every cached read tags itself; every admin write calls `updateTag` with the
 * matching tags. That is what lets public pages be served from the static shell
 * instead of querying Supabase on each request, while still updating the
 * instant an organiser saves a score.
 *
 * node_modules/next/dist/docs/01-app/01-getting-started/09-revalidating.md
 */

export const tags = {
  /** The list of tournaments and which one is current. */
  tournaments: () => "tournaments",
  /** Metadata of one tournament. */
  tournament: (slug: string) => `tournament:${slug}`,
  /** Teams, rosters and groups of one tournament. */
  teams: (slug: string) => `teams:${slug}`,
  /** Stages, groups and the bracket shape. */
  structure: (slug: string) => `structure:${slug}`,
  /** Matches, scores, standings — everything that moves during a tournament. */
  matches: (slug: string) => `matches:${slug}`,
  /** One match page, including games and drafts. */
  match: (id: number) => `match:${id}`,
  /** Final placements and awards. */
  results: (slug: string) => `results:${slug}`,
  /** Hero reference list. */
  heroes: () => "heroes",
} as const;

/** Tags to invalidate when a match, its games or its drafts change. */
export function matchWriteTags(slug: string, matchId: number): string[] {
  return [tags.matches(slug), tags.match(matchId), tags.structure(slug)];
}

/** Tags to invalidate when the tournament structure changes. */
export function structureWriteTags(slug: string): string[] {
  return [
    tags.tournament(slug),
    tags.structure(slug),
    tags.matches(slug),
    tags.teams(slug),
    tags.tournaments(),
  ];
}
