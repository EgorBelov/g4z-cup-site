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
  // Places right under the advance line that still have a shot, via a decider.
  const playin = rows[0]?.playin_count ?? null;
  const playinUntil = advance !== null && playin ? advance + playin : null;
  // Draws only happen in an even series, so a bo1/bo3 group keeps the old columns.
  const hasDraws = rows.some((row) => row.draws > 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-ink-faint">
          <tr>
            <th className="px-3 py-2.5 font-medium">#</th>
            <th className="px-3 py-2.5 font-medium">Команда</th>
            <th className="px-3 py-2.5 text-center font-medium">И</th>
            <th className="px-3 py-2.5 text-center font-medium">В</th>
            {hasDraws ? (
              <th className="px-3 py-2.5 text-center font-medium">Н</th>
            ) : null}
            <th className="px-3 py-2.5 text-center font-medium">П</th>
            <th className="px-3 py-2.5 text-center font-medium">Карты</th>
            <th className="px-3 py-2.5 text-center font-medium">±</th>
            <th className="px-3 py-2.5 text-center font-medium">О</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const position = index + 1;
            const advances = advance !== null && position <= advance;
            const playsDecider =
              !advances && playinUntil !== null && position <= playinUntil;

            return (
              <tr
                key={row.team_id}
                className={cn(
                  "border-t border-edge",
                  advances && "bg-accent-soft/40",
                  playsDecider && "bg-warn-soft/30",
                  !advances && !playsDecider && "bg-surface-sunken/40",
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
                {hasDraws ? (
                  <td className="px-3 py-3 text-center tabular-nums text-ink-muted">
                    {row.draws}
                  </td>
                ) : null}
                <td className="px-3 py-3 text-center tabular-nums text-ink-muted">
                  {row.losses}
                </td>
                <td className="px-3 py-3 text-center tabular-nums text-ink-muted">
                  {row.maps_won}:{row.maps_lost}
                </td>
                <td className="px-3 py-3 text-center tabular-nums text-ink-muted">
                  {row.map_diff > 0 ? `+${row.map_diff}` : row.map_diff}
                </td>
                <td className="px-3 py-3 text-center font-semibold tabular-nums">
                  {row.points}
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

      {playinUntil !== null ? (
        <p className="mt-2 flex items-center gap-2 text-xs text-ink-faint">
          <Badge tone="warn">стыковые матчи</Badge>
          места {advance! + 1}–{playinUntil} играют за оставшиеся слоты
        </p>
      ) : null}

      <p className="mt-2 text-xs text-ink-faint">
        {hasDraws
          ? "О — очки: 2 за победу в серии, 1 за ничью."
          : "О — очки: 2 за победу в серии."}
      </p>
    </div>
  );
}
