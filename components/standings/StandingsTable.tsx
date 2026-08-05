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

  // Phone-first column set. "Карты" is the only column that is pure detail —
  // `±` already summarises it — so it is the one that goes on a narrow screen,
  // which lets the rest of the table fit without sideways scrolling.
  const cell = "px-1 py-3 sm:px-3";
  const head = "px-1 py-2.5 font-medium sm:px-3";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-ink-faint">
          <tr>
            <th className={head}>#</th>
            <th className={cn(head, "w-full")}>Команда</th>
            <th className={cn(head, "text-center")}>И</th>
            <th className={cn(head, "text-center")}>В</th>
            {hasDraws ? <th className={cn(head, "text-center")}>Н</th> : null}
            <th className={cn(head, "text-center")}>П</th>
            <th className={cn(head, "hidden text-center sm:table-cell")}>Карты</th>
            <th className={cn(head, "text-center")}>±</th>
            <th className={cn(head, "text-center")}>О</th>
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
                <td className={cn(cell, "font-semibold tabular-nums")}>{position}</td>
                <td className={cell}>
                  <Link
                    href={`/t/${tournamentSlug}/teams/${row.team_slug}`}
                    className="block max-w-[7.5rem] truncate font-medium hover:text-accent sm:max-w-none"
                  >
                    {row.team_name}
                  </Link>
                </td>
                <td className={cn(cell, "text-center tabular-nums text-ink-muted")}>
                  {row.played}
                </td>
                <td className={cn(cell, "text-center font-semibold tabular-nums")}>
                  {row.wins}
                </td>
                {hasDraws ? (
                  <td className={cn(cell, "text-center tabular-nums text-ink-muted")}>
                    {row.draws}
                  </td>
                ) : null}
                <td className={cn(cell, "text-center tabular-nums text-ink-muted")}>
                  {row.losses}
                </td>
                <td
                  className={cn(
                    cell,
                    "hidden text-center tabular-nums text-ink-muted sm:table-cell",
                  )}
                >
                  {row.maps_won}:{row.maps_lost}
                </td>
                <td className={cn(cell, "text-center tabular-nums text-ink-muted")}>
                  {row.map_diff > 0 ? `+${row.map_diff}` : row.map_diff}
                </td>
                <td className={cn(cell, "text-center font-semibold tabular-nums")}>
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
