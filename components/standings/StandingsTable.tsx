import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";
import type { StandingRow } from "@/lib/types/database";

/**
 * Group table. The advance line comes from the stage's `advance_count`, so the
 * highlight is data-driven instead of the hardcoded "1–2 semifinal, 3–6
 * quarterfinal" rule the previous site had baked into JSX.
 */
export function StandingsTable({
  rows,
  tournamentSlug,
}: {
  rows: StandingRow[];
  tournamentSlug: string;
}) {
  const advance = rows[0]?.advance_count ?? null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-ink-faint">
          <tr>
            <th className="px-3 py-2.5 font-medium">#</th>
            <th className="px-3 py-2.5 font-medium">Команда</th>
            <th className="px-3 py-2.5 text-center font-medium">И</th>
            <th className="px-3 py-2.5 text-center font-medium">В</th>
            <th className="px-3 py-2.5 text-center font-medium">П</th>
            <th className="px-3 py-2.5 text-center font-medium">Карты</th>
            <th className="px-3 py-2.5 text-center font-medium">±</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const position = index + 1;
            const advances = advance !== null && position <= advance;

            return (
              <tr
                key={row.team_id}
                className={cn(
                  "border-t border-edge",
                  advances ? "bg-accent-soft/40" : "bg-surface-sunken/40",
                )}
              >
                <td className="px-3 py-3 font-semibold tabular-nums">{position}</td>
                <td className="px-3 py-3">
                  <Link
                    href={`/t/${tournamentSlug}/teams/${row.team_slug}`}
                    className="font-medium hover:text-accent"
                  >
                    {row.team_name}
                  </Link>
                </td>
                <td className="px-3 py-3 text-center tabular-nums text-ink-muted">
                  {row.played}
                </td>
                <td className="px-3 py-3 text-center font-semibold tabular-nums">
                  {row.wins}
                </td>
                <td className="px-3 py-3 text-center tabular-nums text-ink-muted">
                  {row.losses}
                </td>
                <td className="px-3 py-3 text-center tabular-nums text-ink-muted">
                  {row.maps_won}:{row.maps_lost}
                </td>
                <td className="px-3 py-3 text-center tabular-nums text-ink-muted">
                  {row.map_diff > 0 ? `+${row.map_diff}` : row.map_diff}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {advance !== null ? (
        <p className="mt-4 flex items-center gap-2 text-xs text-ink-faint">
          <Badge tone="accent">проходят дальше</Badge>
          первые {advance} команд группы
        </p>
      ) : null}
    </div>
  );
}
