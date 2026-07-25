import { updateTag } from "next/cache";

/**
 * Expires the cache entries an admin write affects.
 *
 * `updateTag` (not `revalidateTag`) so the organiser who just saved a score sees
 * it on the public page immediately instead of a stale copy.
 * node_modules/next/dist/docs/01-app/api-reference/functions/updateTag.md
 */
export function invalidate(...tagList: (string | null | undefined)[]): void {
  for (const tag of new Set(tagList.filter((value): value is string => !!value))) {
    updateTag(tag);
  }
}
