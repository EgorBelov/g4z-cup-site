"use client";

import { useState } from "react";
import { TournamentList } from "./TournamentList";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import type { TournamentSummary } from "@/lib/types/database";

export function TournamentExplorer({
  tournaments,
}: {
  tournaments: TournamentSummary[];
}) {
  const [game, setGame] = useState<string | null>(null);
  const games = [...new Set(tournaments.map((tournament) => tournament.game))];
  const visible =
    game === null
      ? tournaments
      : tournaments.filter((tournament) => tournament.game === game);

  return (
    <div>
      {games.length > 1 ? (
        <div
          role="group"
          aria-label="Дисциплина турниров"
          className="mb-5 flex flex-wrap gap-2"
        >
          {[null, ...games].map((item) => (
            <button
              key={item ?? "all"}
              type="button"
              aria-pressed={game === item}
              onClick={() => setGame(item)}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-pill border px-4 py-2 text-sm transition",
                game === item
                  ? "border-accent bg-accent text-surface"
                  : "border-edge bg-panel text-ink-muted hover:border-edge-strong hover:text-ink",
              )}
            >
              <Icon name={item === null ? "grid" : "game"} className="size-4" />
              {item ?? "Все игры"}
              <span className="font-mono text-xs opacity-70">
                {item === null
                  ? tournaments.length
                  : tournaments.filter((t) => t.game === item).length}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      <p role="status" className="sr-only">
        Показано турниров: {visible.length}
      </p>
      <TournamentList tournaments={visible} />
    </div>
  );
}
