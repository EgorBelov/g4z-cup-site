import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { averageMmr, formatMmr } from "@/lib/format/mmr";
import type { Player, Team } from "@/lib/types/database";

export function TeamCard({
  team,
  groupName,
  players,
  href,
}: {
  team: Team;
  groupName?: string | null;
  players: Player[];
  href: string;
}) {
  const average = averageMmr(players);

  return (
    <Link
      href={href}
      className="flex h-full flex-col rounded-card border border-edge bg-panel p-5 transition hover:border-accent/40 hover:bg-panel-strong"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold tracking-tight">{team.name}</h3>
          {team.tag ? (
            <p className="mt-1 text-xs uppercase tracking-wide text-ink-faint">
              {team.tag}
            </p>
          ) : null}
        </div>
        {groupName ? <Badge tone="neutral">{groupName}</Badge> : null}
      </div>

      {players.length > 0 ? (
        <ul className="mt-4 space-y-1.5 text-sm">
          {players.slice(0, 5).map((player) => (
            <li key={player.id} className="flex min-w-0 items-center gap-2">
              {/* min-w-0 on the item too: a flex child will not truncate below
                  its content width without it, and nicknames get long. */}
              <span className="min-w-0 truncate text-ink-muted">{player.nickname}</span>
              {player.is_captain ? (
                <span className="shrink-0 text-[10px] uppercase text-accent">
                  капитан
                </span>
              ) : null}
              {player.mmr !== null ? (
                <span className="ml-auto shrink-0 tabular-nums text-xs text-ink-faint">
                  {formatMmr(player.mmr)}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-faint">Состав ещё не заявлен</p>
      )}

      {team.seed || average !== null ? (
        <p className="mt-auto flex items-center justify-between gap-3 pt-4 text-xs text-ink-faint">
          {team.seed ? <span>Посев {team.seed}</span> : <span />}
          {average !== null ? (
            <span className="tabular-nums">средний MMR {formatMmr(average)}</span>
          ) : null}
        </p>
      ) : null}
    </Link>
  );
}
