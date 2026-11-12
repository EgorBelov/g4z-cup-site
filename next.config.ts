import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components: public pages are prerendered into a static shell and
  // refreshed on demand with `updateTag` from admin actions instead of hitting
  // the database on every request.
  // node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md
  cacheComponents: true,
  // Keep the existing prefetch behavior while upgrading the application.
  // node_modules/next/dist/docs/01-app/02-guides/adopting-partial-prefetching.md
  partialPrefetching: true,
};

export default nextConfig;
