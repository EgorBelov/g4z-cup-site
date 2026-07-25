import { readClient } from "@/lib/supabase/read";

/**
 * `generateStaticParams` sources.
 *
 * With Cache Components a dynamic route must return at least one param, so each
 * helper falls back to a placeholder when the database is unreachable (for
 * example a CI build without Supabase credentials). Unknown slugs still render
 * on demand, so tournaments created after a deploy work without rebuilding.
 * node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-static-params.md
 */

const FALLBACK_SLUG = "g4z-cup-10";

export async function tournamentSlugParams(): Promise<{ slug: string }[]> {
  try {
    const { data, error } = await readClient()
      .from("tournaments")
      .select("slug")
      .neq("status", "draft");

    const rows = (data ?? []) as { slug: string }[];
    if (error || rows.length === 0) return [{ slug: FALLBACK_SLUG }];

    return rows.map((row) => ({ slug: row.slug }));
  } catch {
    return [{ slug: FALLBACK_SLUG }];
  }
}

export async function matchParams(): Promise<{ slug: string; id: string }[]> {
  try {
    const { data, error } = await readClient()
      .from("match_details")
      .select("id, tournament_slug")
      .limit(500);

    const rows = (data ?? []) as { id: number; tournament_slug: string }[];
    if (error || rows.length === 0) return [{ slug: FALLBACK_SLUG, id: "1" }];

    return rows.map((row) => ({
      slug: row.tournament_slug,
      id: String(row.id),
    }));
  } catch {
    return [{ slug: FALLBACK_SLUG, id: "1" }];
  }
}

export async function teamParams(): Promise<{ slug: string; team: string }[]> {
  const fallback = [{ slug: FALLBACK_SLUG, team: "rehub" }];

  try {
    const client = readClient();

    const [teams, tournaments] = await Promise.all([
      client.from("teams").select("slug, tournament_id").limit(500),
      client.from("tournaments").select("id, slug").neq("status", "draft"),
    ]);

    const teamRows = (teams.data ?? []) as {
      slug: string;
      tournament_id: number;
    }[];
    const tournamentRows = (tournaments.data ?? []) as {
      id: number;
      slug: string;
    }[];

    const slugById = new Map(tournamentRows.map((row) => [row.id, row.slug]));

    const params = teamRows
      .map((team) => {
        const tournamentSlug = slugById.get(team.tournament_id);
        return tournamentSlug ? { slug: tournamentSlug, team: team.slug } : null;
      })
      .filter((entry): entry is { slug: string; team: string } => entry !== null);

    return params.length > 0 ? params : fallback;
  } catch {
    return fallback;
  }
}
