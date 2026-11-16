import { headers } from "next/headers";

/**
 * Dependency-free liveness probe for network diagnostics.
 *
 * Deliberately touches neither Supabase nor the session: if this answers, the
 * request reached the deployment. `/api/health` is the deeper check that also
 * verifies write credentials.
 */
export async function GET() {
  const list = await headers();

  return Response.json(
    {
      ok: true,
      // Short git SHA of the deployment, so "is the fix live?" is one request.
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      edge: list.get("cf-ray") ?? null,
      country: list.get("cf-ipcountry") ?? null,
      region: list.get("x-vercel-id") ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
