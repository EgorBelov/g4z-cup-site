"use client";

import { useActionState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { FormFeedback, IconSubmit, SubmitButton } from "@/components/ui/Form";
import { Card, CardHeader } from "@/components/ui/Card";
import { idle } from "@/lib/actions/state";
import {
  addGameAction,
  deleteGameAction,
  saveDraftAction,
  saveGameAction,
} from "@/lib/actions/games";
import type {
  Game,
  GameBan,
  GamePick,
  Hero,
  MatchDetails,
  Player,
} from "@/lib/types/database";

const PICK_SLOTS = 5;
const BAN_SLOTS = 7;

export function AddGameButton({ matchId }: { matchId: number }) {
  return (
    <form action={addGameAction}>
      <input type="hidden" name="match_id" value={matchId} />
      <IconSubmit title="Добавить карту">+ Добавить карту</IconSubmit>
    </form>
  );
}

function GameSettings({ match, game }: { match: MatchDetails; game: Game }) {
  const [state, action] = useActionState(saveGameAction, idle);

  const teamOptions = [
    { id: match.team1_id, name: match.team1_name ?? "Команда 1" },
    { id: match.team2_id, name: match.team2_name ?? "Команда 2" },
  ].filter((option): option is { id: number; name: string } => option.id !== null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="match_id" value={match.id} />
      <input type="hidden" name="game_id" value={game.id} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Победитель карты">
          <Select name="winner_id" defaultValue={game.winner_id ?? ""}>
            <option value="">не определён</option>
            {teamOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Radiant">
          <Select name="radiant_team_id" defaultValue={game.radiant_team_id ?? ""}>
            <option value="">—</option>
            {teamOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Длительность, мин">
          <Input
            name="duration_minutes"
            type="number"
            min={1}
            defaultValue={
              game.duration_seconds ? Math.round(game.duration_seconds / 60) : ""
            }
          />
        </Field>

        <Field label="ID матча в Dota">
          <Input
            name="dota_match_id"
            type="number"
            defaultValue={game.dota_match_id ?? ""}
          />
        </Field>
      </div>

      <Field label="Заметка к карте">
        <Textarea name="notes" rows={2} defaultValue={game.notes ?? ""} />
      </Field>

      <FormFeedback state={state} />
      <SubmitButton size="sm">Сохранить карту</SubmitButton>
    </form>
  );
}

function DraftSide({
  side,
  teamName,
  picks,
  bans,
  players,
}: {
  side: 1 | 2;
  teamName: string;
  picks: GamePick[];
  bans: GameBan[];
  players: Player[];
}) {
  const prefix = `team${side}`;

  return (
    <div className="min-w-0 flex-1 space-y-3">
      <h4 className="truncate font-semibold">{teamName}</h4>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-ink-faint">Пики</p>
        {Array.from({ length: PICK_SLOTS }, (_, index) => {
          const pick = picks[index];

          return (
            <div key={index} className="grid grid-cols-2 gap-2">
              <Input
                name={`${prefix}_pick_hero`}
                list="hero-list"
                defaultValue={pick?.hero ?? ""}
                placeholder={`Герой ${index + 1}`}
                aria-label={`${teamName}: герой ${index + 1}`}
              />
              <Input
                name={`${prefix}_pick_player`}
                list={`roster-${side}`}
                defaultValue={pick?.player_name ?? players[index]?.nickname ?? ""}
                placeholder="Игрок"
                aria-label={`${teamName}: игрок ${index + 1}`}
              />
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-ink-faint">Баны</p>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: BAN_SLOTS }, (_, index) => (
            <Input
              key={index}
              name={`${prefix}_ban_hero`}
              list="hero-list"
              defaultValue={bans[index]?.hero ?? ""}
              placeholder={`Бан ${index + 1}`}
              aria-label={`${teamName}: бан ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DraftEditor({
  match,
  game,
  picks,
  bans,
  rosters,
}: {
  match: MatchDetails;
  game: Game;
  picks: GamePick[];
  bans: GameBan[];
  rosters: { team1: Player[]; team2: Player[] };
}) {
  const [state, action] = useActionState(saveDraftAction, idle);

  if (!match.team1_id || !match.team2_id) {
    return (
      <p className="text-sm text-ink-faint">
        Драфт можно вносить, когда обе команды известны.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="match_id" value={match.id} />
      <input type="hidden" name="game_id" value={game.id} />
      <input type="hidden" name="team1_id" value={match.team1_id} />
      <input type="hidden" name="team2_id" value={match.team2_id} />

      <datalist id="roster-1">
        {rosters.team1.map((player) => (
          <option key={player.id} value={player.nickname} />
        ))}
      </datalist>
      <datalist id="roster-2">
        {rosters.team2.map((player) => (
          <option key={player.id} value={player.nickname} />
        ))}
      </datalist>

      <div className="flex flex-col gap-6 lg:flex-row">
        <DraftSide
          side={1}
          teamName={match.team1_name ?? "Команда 1"}
          picks={picks.filter((pick) => pick.team_id === match.team1_id)}
          bans={bans.filter((ban) => ban.team_id === match.team1_id)}
          players={rosters.team1}
        />
        <div className="hidden w-px bg-edge lg:block" />
        <DraftSide
          side={2}
          teamName={match.team2_name ?? "Команда 2"}
          picks={picks.filter((pick) => pick.team_id === match.team2_id)}
          bans={bans.filter((ban) => ban.team_id === match.team2_id)}
          players={rosters.team2}
        />
      </div>

      <FormFeedback state={state} />
      <SubmitButton size="sm" variant="secondary">
        Сохранить драфт
      </SubmitButton>
    </form>
  );
}

export function GameEditor({
  match,
  games,
  picks,
  bans,
  rosters,
  heroes,
}: {
  match: MatchDetails;
  games: Game[];
  picks: GamePick[];
  bans: GameBan[];
  rosters: { team1: Player[]; team2: Player[] };
  heroes: Hero[];
}) {
  return (
    <div className="space-y-5">
      <datalist id="hero-list">
        {heroes.map((hero) => (
          <option key={hero.id} value={hero.name} />
        ))}
      </datalist>

      {games.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Карт пока нет. Добавьте первую — счёт матча посчитается сам.
        </p>
      ) : null}

      {games.map((game) => (
        <Card key={game.id} className="bg-surface-sunken/40">
          <CardHeader
            title={`Карта ${game.game_number}`}
            hint={
              game.winner_id
                ? `Победитель: ${
                    game.winner_id === match.team1_id
                      ? (match.team1_name ?? "команда 1")
                      : (match.team2_name ?? "команда 2")
                  }`
                : "победитель не определён"
            }
            action={
              <form action={deleteGameAction}>
                <input type="hidden" name="match_id" value={match.id} />
                <input type="hidden" name="game_id" value={game.id} />
                <IconSubmit title="Удалить карту" variant="danger">
                  ×
                </IconSubmit>
              </form>
            }
          />

          <div className="space-y-6 p-5">
            <GameSettings match={match} game={game} />
            <div className="border-t border-edge pt-5">
              <DraftEditor
                match={match}
                game={game}
                picks={picks.filter((pick) => pick.game_id === game.id)}
                bans={bans.filter((ban) => ban.game_id === game.id)}
                rosters={rosters}
              />
            </div>
          </div>
        </Card>
      ))}

      <AddGameButton matchId={match.id} />
    </div>
  );
}
