import { Badge } from "@/components/ui/Badge";
import { Card, EmptyState } from "@/components/ui/Card";
import { formatDuration } from "@/lib/format/date";
import { cn } from "@/lib/utils/cn";
import type { Game, GameBan, GamePick, MatchDetails } from "@/lib/types/database";

function DraftColumn({
  teamName,
  picks,
  bans,
  isWinner,
}: {
  teamName: string;
  picks: GamePick[];
  bans: GameBan[];
  isWinner: boolean;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-3 flex items-center gap-2">
        <span
          className={cn(
            "truncate font-semibold",
            isWinner ? "text-accent" : "text-ink-muted",
          )}
        >
          {teamName}
        </span>
        {isWinner ? <Badge tone="accent">победа</Badge> : null}
      </div>

      {picks.length > 0 ? (
        <ul className="space-y-1.5">
          {picks.map((pick) => (
            <li
              key={pick.id}
              className="flex items-center justify-between gap-3 rounded-control border border-edge bg-surface-sunken/60 px-3 py-2 text-sm"
            >
              <span className="truncate font-medium">{pick.hero}</span>
              {pick.player_name ? (
                <span className="shrink-0 text-xs text-ink-faint">
                  {pick.player_name}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-faint">Пики не внесены</p>
      )}

      {bans.length > 0 ? (
        <div className="mt-3">
          <p className="mb-1.5 text-xs uppercase tracking-wide text-ink-faint">Баны</p>
          <p className="text-sm text-ink-muted">
            {bans.map((ban) => ban.hero).join(", ")}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function GameList({
  match,
  games,
  picks,
  bans,
}: {
  match: MatchDetails;
  games: Game[];
  picks: GamePick[];
  bans: GameBan[];
}) {
  if (games.length === 0) {
    return (
      <EmptyState
        title="Карты ещё не добавлены"
        hint="Как только матч начнётся, здесь появятся счёт по картам, драфт и длительность."
      />
    );
  }

  return (
    <div className="space-y-4">
      {games.map((game) => {
        const gamePicks = picks.filter((pick) => pick.game_id === game.id);
        const gameBans = bans.filter((ban) => ban.game_id === game.id);
        const duration = formatDuration(game.duration_seconds);

        return (
          <Card key={game.id} className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-bold">Карта {game.game_number}</h3>
              <div className="flex flex-wrap items-center gap-2">
                {duration ? <Badge tone="neutral">{duration}</Badge> : null}
                {game.radiant_team_id ? (
                  <Badge tone="info">
                    Radiant:{" "}
                    {game.radiant_team_id === match.team1_id
                      ? (match.team1_name ?? "TBD")
                      : (match.team2_name ?? "TBD")}
                  </Badge>
                ) : null}
                {game.dota_match_id ? (
                  <a
                    href={`https://www.dotabuff.com/matches/${game.dota_match_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-info hover:underline"
                  >
                    Dotabuff
                  </a>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-6 sm:flex-row">
              <DraftColumn
                teamName={match.team1_name ?? "Команда 1"}
                picks={gamePicks.filter((pick) => pick.team_id === match.team1_id)}
                bans={gameBans.filter((ban) => ban.team_id === match.team1_id)}
                isWinner={game.winner_id === match.team1_id}
              />
              <div className="hidden w-px bg-edge sm:block" />
              <DraftColumn
                teamName={match.team2_name ?? "Команда 2"}
                picks={gamePicks.filter((pick) => pick.team_id === match.team2_id)}
                bans={gameBans.filter((ban) => ban.team_id === match.team2_id)}
                isWinner={game.winner_id === match.team2_id}
              />
            </div>

            {game.notes ? (
              <p className="mt-4 text-sm text-ink-faint">{game.notes}</p>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
