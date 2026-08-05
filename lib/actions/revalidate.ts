import { refresh, updateTag } from "next/cache";

/**
 * Expires the cache entries an admin write affects, then re-renders the page
 * the organiser is standing on.
 *
 * `updateTag` (not `revalidateTag`) so the organiser who just saved a score sees
 * it on the public page immediately instead of a stale copy.
 * node_modules/next/dist/docs/01-app/api-reference/functions/updateTag.md
 *
 * `refresh` covers what tags cannot: admin reads go through
 * `lib/queries/admin.ts`, which is deliberately uncached (service role, shows
 * drafts), so no tag describes them. Without it the client router keeps the RSC
 * payload it already has and an action that returns a state instead of
 * redirecting leaves the screen unchanged until a manual reload.
 * node_modules/next/dist/docs/01-app/03-api-reference/04-functions/refresh.md
 */
export function invalidate(...tagList: (string | null | undefined)[]): void {
  for (const tag of new Set(tagList.filter((value): value is string => !!value))) {
    updateTag(tag);
  }

  refresh();
}
