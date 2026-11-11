import { refresh, updateTag } from "next/cache";

/**
 * Expires affected public data and refreshes uncached personal/admin reads.
 *
 * `updateTag` (not `revalidateTag`) so the organiser who just saved a score sees
 * it on the public page immediately instead of a stale copy.
 * node_modules/next/dist/docs/01-app/03-api-reference/04-functions/updateTag.md
 *
 * Request the dynamic refresh first: calling refresh after updateTag overwrites
 * Next's static-and-dynamic invalidation flag with a dynamic-only refresh.
 * node_modules/next/dist/docs/01-app/03-api-reference/04-functions/refresh.md
 */
export function invalidate(...tagList: (string | null | undefined)[]): void {
  refresh();
  for (const tag of new Set(tagList.filter((value): value is string => !!value))) {
    updateTag(tag);
  }
}
