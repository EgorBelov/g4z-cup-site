import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { averageMmr, formatMmr } from "@/lib/format/mmr";
import type { Player, Team } from "@/lib/types/database";

export function TeamCard({
  team,
  groupName,
  players,
  href,
  showMmr = true,
}: {
  team: Team;
  groupName?: string | null;
  players: Player[];
  href: string;
  showMmr?: boolean;
}) {
  const main = players.filter((p) => !p.is_standin);
  const rated = main.filter((p) => p.mmr !== null).length;
  const average = showMmr ? averageMmr(main) : null;

  return (
    <Link
      href={href}
      className="group flex h-full flex-col border-t border-edge py-7 transition hover:border-accent"
    >
      <div className="mb-6 flex items-center justify-between">
        <span className="text-4xl tracking-tight text-accent">
          {team.tag ?? team.name.slice(0, 3).toUpperCase()}
        </span>
        <span aria-hidden="true" className="text-xl text-accent">
          ↗
        </span>
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-2xl font-normal tracking-tight group-hover:text-accent">
            {team.name}
          </h3>
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
          {players.map((player) => (
            <li key={player.id} className="flex min-w-0 items-center gap-2">
              {/* min-w-0 on the item too: a flex child will not truncate below
                  its content width without it, and nicknames get long. */}
              <span className="min-w-0 truncate text-ink-muted">{player.nickname}</span>
              {player.is_captain ? (
                <span className="shrink-0 text-xs uppercase text-accent">капитан</span>
              ) : null}
              {showMmr && player.mmr !== null ? (
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
            <span className="tabular-nums">
              MMR {formatMmr(average)} · {rated}/{main.length}
            </span>
          ) : null}
        </p>
      ) : null}
    </Link>
  );
}
