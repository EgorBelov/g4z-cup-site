"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { FormFeedback, IconSubmit, SubmitButton } from "@/components/ui/Form";
import { idle } from "@/lib/actions/state";
import {
  assignGroupAction,
  deleteTeamAction,
  saveRosterAction,
  saveTeamAction,
} from "@/lib/actions/teams";
import type { Group, Player, Team } from "@/lib/types/database";

const ROSTER_SLOTS = 7;
const subscribeHydration = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;

export function TeamForm({
  tournamentId,
  groups,
  team,
}: {
  tournamentId: number;
  groups: Group[];
  team?: Team;
}) {
  const [state, action] = useActionState(saveTeamAction, idle);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      {team ? <input type="hidden" name="team_id" value={team.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Название" error={state.fieldErrors?.name}>
          <Input name="name" defaultValue={team?.name ?? ""} required />
        </Field>

        <Field
          label="Слаг"
          hint={team ? `/t/…/teams/${team.slug}` : "Пусто — сделаем из названия"}
          error={state.fieldErrors?.slug}
        >
          <Input name="slug" defaultValue={team?.slug ?? ""} placeholder="rehub" />
        </Field>

        <Field label="Тег" error={state.fieldErrors?.tag}>
          <Input name="tag" defaultValue={team?.tag ?? ""} placeholder="RHB" />
        </Field>

        <Field
          label="Посев"
          hint="Используется при генерации сетки и разбросе по группам"
          error={state.fieldErrors?.seed}
        >
          <Input name="seed" type="number" min={1} defaultValue={team?.seed ?? ""} />
        </Field>

        <Field label="Группа" error={state.fieldErrors?.group_id}>
          <Select name="group_id" defaultValue={team?.group_id ?? ""}>
            <option value="">без группы</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Логотип (ссылка)" error={state.fieldErrors?.logo_url}>
          <Input name="logo_url" type="url" defaultValue={team?.logo_url ?? ""} />
        </Field>
      </div>

      <Field label="Описание">
        <Textarea name="description" rows={3} defaultValue={team?.description ?? ""} />
      </Field>

      <FormFeedback state={state} />
      <SubmitButton>{team ? "Сохранить команду" : "Создать команду"}</SubmitButton>
    </form>
  );
}

/**
 * React keys and submitted IDs follow players when rows are reordered.
 */
export function RosterForm({
  teamId,
  rosterVersion,
  players,
  showMmr = true,
}: {
  teamId: number;
  rosterVersion: number;
  players: Player[];
  showMmr?: boolean;
}) {
  const [state, action] = useActionState(saveRosterAction, idle);
  // Reordering needs client state. Do not accept clicks on the server-rendered
  // buttons before React has attached their handlers.
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    clientHydrated,
    serverHydrated,
  );
  const [rows, setRows] = useState(() =>
    Array.from({ length: Math.max(ROSTER_SLOTS, players.length) }, (_, index) => ({
      key: players[index] ? `player-${players[index].id}` : `new-${index}`,
      player: players[index],
    })),
  );

  function moveRow(index: number, direction: -1 | 1) {
    setRows((current) => {
      const next = current.slice();
      [next[index], next[index + direction]] = [next[index + direction]!, next[index]!];
      return next;
    });
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="team_id" value={teamId} />
      <input type="hidden" name="roster_version" value={rosterVersion} />

      <div className="space-y-2">
        {rows.map(({ key, player }, index) => {
          return (
            <div
              key={key}
              data-roster-row
              className="space-y-2 rounded-control border border-edge bg-surface-sunken/60 p-3"
            >
              <input type="hidden" name="player_id" value={player?.id ?? ""} />
              <div className="flex items-center justify-between gap-2">
                <span className="eyebrow">Игрок {index + 1}</span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!hydrated || index === 0}
                    aria-label={`Поднять игрока ${index + 1}`}
                    onClick={() => moveRow(index, -1)}
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!hydrated || index === rows.length - 1}
                    aria-label={`Опустить игрока ${index + 1}`}
                    onClick={() => moveRow(index, 1)}
                  >
                    ↓
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  name="nickname"
                  defaultValue={player?.nickname ?? ""}
                  maxLength={80}
                  placeholder={`Ник игрока ${index + 1}`}
                  aria-label={`Ник игрока ${index + 1}`}
                />
                <Input
                  name="real_name"
                  defaultValue={player?.real_name ?? ""}
                  placeholder="Имя (необязательно)"
                  aria-label={`Имя игрока ${index + 1}`}
                />
                <Input
                  name="role"
                  defaultValue={player?.role ?? ""}
                  placeholder="Роль"
                  aria-label={`Роль игрока ${index + 1}`}
                />
                <Input
                  className={showMmr ? undefined : "hidden"}
                  name="mmr"
                  type="number"
                  min={0}
                  max={20000}
                  defaultValue={player?.mmr ?? ""}
                  placeholder="MMR"
                  aria-label={`MMR игрока ${index + 1}`}
                />
                <label className="flex items-center justify-center gap-2 text-xs text-ink-faint">
                  <input
                    type="radio"
                    name="captain"
                    value={index + 1}
                    defaultChecked={player?.is_captain ?? false}
                    className="accent-accent"
                  />
                  капитан
                </label>
                <Select
                  name="is_standin"
                  defaultValue={String(player?.is_standin ?? false)}
                  aria-label={`Слот игрока ${index + 1}`}
                >
                  <option value="false">Основной состав</option>
                  <option value="true">Запасной</option>
                </Select>
              </div>
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!hydrated || rows.length >= 64}
        onClick={() =>
          setRows((current) => [
            ...current,
            { key: `new-${current.length}`, player: undefined },
          ])
        }
      >
        + Добавить игрока
      </Button>

      <p className="text-xs text-ink-faint">
        Чтобы убрать игрока, очистите его ник. Перестановка строк сохраняет связи с
        драфтами и наградами. Весь состав сохраняется одним действием.
      </p>

      <FormFeedback state={state} />
      <SubmitButton>Сохранить состав</SubmitButton>
    </form>
  );
}

export function GroupPicker({
  tournamentId,
  teamId,
  groups,
  currentGroupId,
}: {
  tournamentId: number;
  teamId: number;
  groups: Group[];
  currentGroupId: number | null;
}) {
  return (
    <form action={assignGroupAction} className="flex items-center gap-2">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="team_id" value={teamId} />
      <Select
        name="group_id"
        defaultValue={currentGroupId ?? ""}
        className="py-1.5 text-sm"
        aria-label="Группа команды"
      >
        <option value="">без группы</option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name}
          </option>
        ))}
      </Select>
      <IconSubmit title="Применить группу">→</IconSubmit>
    </form>
  );
}

export function DeleteTeamButton({
  tournamentId,
  teamId,
}: {
  tournamentId: number;
  teamId: number;
}) {
  return (
    <form action={deleteTeamAction}>
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="id" value={teamId} />
      <IconSubmit title="Удалить команду" variant="danger">
        Удалить команду
      </IconSubmit>
    </form>
  );
}
