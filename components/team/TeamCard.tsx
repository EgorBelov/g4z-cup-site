import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
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
      className="interactive-card group flex h-full min-w-0 flex-col rounded-card border border-edge bg-panel p-5 sm:p-6"
    >
      <div className="mb-6 flex items-center justify-between">
        <span className="flex min-h-16 min-w-16 max-w-full items-center justify-center break-all rounded-control border border-accent/20 bg-accent-soft px-3 py-2 text-2xl tracking-tight text-accent">
          {team.tag ?? team.name.slice(0, 3).toUpperCase()}
        </span>
        <span className="ml-3 grid size-9 shrink-0 place-items-center rounded-pill bg-panel-strong text-accent">
          <Icon name="arrow" className="size-4" />
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
        <ul className="mt-5 space-y-2 text-sm">
          {players.map((player) => (
            <li
              key={player.id}
              className="flex min-w-0 items-center gap-2 rounded-control bg-surface px-3 py-2"
            >
              <span
                aria-hidden="true"
                className="grid size-6 shrink-0 place-items-center rounded-pill bg-panel-strong text-xs text-accent"
              >
                {player.nickname.slice(0, 1).toUpperCase()}
              </span>
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
