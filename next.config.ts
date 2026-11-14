import type { NextConfig } from "next";

/**
 * Landing pages may be cached at the CDN edge for a few seconds. Tournament
 * pages with live scores are deliberately left out: organisers expect the
 * result of `updateTag` to be visible immediately.
 */
const PUBLIC_PAGE_CACHE = "public, s-maxage=30, stale-while-revalidate=60";
const publicPages = ["/", "/rules", "/archive"];

const nextConfig: NextConfig = {
  // Cache Components: public pages are prerendered into a static shell and
  // refreshed on demand with `updateTag` from admin actions instead of hitting
  // the database on every request.
  // node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md
  cacheComponents: true,
  // Keep the existing prefetch behavior while upgrading the application.
  // node_modules/next/dist/docs/01-app/02-guides/adopting-partial-prefetching.md
  partialPrefetching: false,
  async headers() {
    return publicPages.map((source) => ({
      source,
      headers: [{ key: "CDN-Cache-Control", value: PUBLIC_PAGE_CACHE }],
    }));
  },
};

export default nextConfig;
