"use client";

import { useActionState } from "react";
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
 * Roster editor. Rows are matched to existing players by position, so saving
 * updates in place instead of wiping and re-inserting the squad.
 */
export function RosterForm({ teamId, players }: { teamId: number; players: Player[] }) {
  const [state, action] = useActionState(saveRosterAction, idle);
  const captainIndex = players.findIndex((player) => player.is_captain);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="team_id" value={teamId} />

      <div className="space-y-2">
        {Array.from({ length: ROSTER_SLOTS }, (_, index) => {
          const player = players[index];

          return (
            <div
              key={index}
              className="grid gap-2 rounded-control border border-edge bg-surface-sunken/60 p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_auto]"
            >
              <Input
                name="nickname"
                defaultValue={player?.nickname ?? ""}
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
                  defaultChecked={captainIndex === index}
                  className="accent-accent"
                />
                капитан
              </label>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-ink-faint">
        Пустые строки игнорируются. Игроки, которых вы убрали, удаляются только после
        успешного сохранения остальных.
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
