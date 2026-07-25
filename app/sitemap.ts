import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
import { listTournaments } from "@/lib/queries/public";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const entries: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/archive`, changeFrequency: "monthly", priority: 0.6 },
  ];

  try {
    const tournaments = await listTournaments();

    for (const tournament of tournaments) {
      const root = `${base}/t/${tournament.slug}`;
      const frequency = tournament.status === "live" ? "hourly" : "weekly";

      for (const path of [
        "",
        "/schedule",
        "/groups",
        "/bracket",
        "/teams",
        "/results",
      ]) {
        entries.push({
          url: `${root}${path}`,
          changeFrequency: frequency,
          priority: tournament.is_current ? 0.9 : 0.5,
          lastModified: tournament.updated_at,
        });
      }
    }
  } catch (cause) {
    console.error("sitemap: could not list tournaments", cause);
  }

  return entries;
}
