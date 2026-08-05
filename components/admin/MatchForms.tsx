"use client";

import { useActionState } from "react";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/Field";
import { FormFeedback, IconSubmit, SubmitButton } from "@/components/ui/Form";
import { idle } from "@/lib/actions/state";
import {
  deleteMatchAction,
  saveMatchAction,
  setMatchStatusAction,
  shiftScheduleAction,
} from "@/lib/actions/matches";
import { toDateTimeLocal } from "@/lib/format/date";
import type { Group, MatchDetails, Stage, Team } from "@/lib/types/database";

export function MatchForm({
  tournamentId,
  timeZone,
  stages,
  groups,
  teams,
  match,
}: {
  tournamentId: number;
  timeZone: string;
  stages: Stage[];
  groups: Group[];
  teams: Team[];
  match?: MatchDetails;
}) {
  const [state, action] = useActionState(saveMatchAction, idle);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      {match ? <input type="hidden" name="match_id" value={match.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Этап" error={state.fieldErrors?.stage_id}>
          <Select name="stage_id" defaultValue={match?.stage_id ?? stages[0]?.id}>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Группа" error={state.fieldErrors?.group_id}>
          <Select name="group_id" defaultValue={match?.group_id ?? ""}>
            <option value="">без группы</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Команда 1" error={state.fieldErrors?.team1_id}>
          <Select name="team1_id" defaultValue={match?.team1_id ?? ""}>
            <option value="">TBD</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Команда 2" error={state.fieldErrors?.team2_id}>
          <Select name="team2_id" defaultValue={match?.team2_id ?? ""}>
            <option value="">TBD</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Подпись слота 1" hint="Показывается, пока команда неизвестна">
          <Input name="team1_source" defaultValue={match?.team1_source ?? ""} />
        </Field>

        <Field label="Подпись слота 2">
          <Input name="team2_source" defaultValue={match?.team2_source ?? ""} />
        </Field>

        <Field label="Раунд" error={state.fieldErrors?.round}>
          <Input name="round" type="number" min={1} defaultValue={match?.round ?? 1} />
        </Field>

        <Field label="Позиция в раунде" error={state.fieldErrors?.position}>
          <Input
            name="position"
            type="number"
            min={1}
            defaultValue={match?.position ?? 1}
          />
        </Field>

        <Field label="Название раунда">
          <Input
            name="round_label"
            defaultValue={match?.round_label ?? ""}
            placeholder="Полуфинал"
          />
        </Field>

        <Field label="Формат серии" error={state.fieldErrors?.best_of}>
          <Select name="best_of" defaultValue={String(match?.best_of ?? 1)}>
            {[1, 2, 3, 5, 7].map((value) => (
              <option key={value} value={value}>
                bo{value}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Время начала" error={state.fieldErrors?.scheduled_at}>
          <Input
            name="scheduled_at"
            type="datetime-local"
            defaultValue={toDateTimeLocal(match?.scheduled_at ?? null, timeZone)}
          />
        </Field>

        <Field label="Ссылка на стрим" error={state.fieldErrors?.stream_url}>
          <Input name="stream_url" type="url" defaultValue={match?.stream_url ?? ""} />
        </Field>

        <Field label="Запись матча (VOD)" error={state.fieldErrors?.vod_url}>
          <Input name="vod_url" type="url" defaultValue={match?.vod_url ?? ""} />
        </Field>
      </div>

      <Field label="Заметки">
        <Textarea name="notes" rows={2} defaultValue={match?.notes ?? ""} />
      </Field>

      <Checkbox
        name="is_featured"
        label="Главный матч (показывать первым в блоке «Идёт сейчас»)"
        defaultChecked={match?.is_featured ?? false}
      />

      <FormFeedback state={state} />
      <SubmitButton>{match ? "Сохранить матч" : "Создать матч"}</SubmitButton>
    </form>
  );
}

export function StatusButtons({ match }: { match: MatchDetails }) {
  const options: {
    status: string;
    label: string;
    variant: "secondary" | "live" | "danger";
  }[] = [
    { status: "scheduled", label: "Вернуть в расписание", variant: "secondary" },
    { status: "live", label: "Начать матч", variant: "live" },
    { status: "cancelled", label: "Отменить", variant: "danger" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {options
        .filter((option) => option.status !== match.status)
        .map((option) => (
          <form key={option.status} action={setMatchStatusAction}>
            <input type="hidden" name="match_id" value={match.id} />
            <input type="hidden" name="status" value={option.status} />
            <IconSubmit
              title={option.label}
              variant={option.variant === "live" ? "secondary" : option.variant}
            >
              {option.label}
            </IconSubmit>
          </form>
        ))}
    </div>
  );
}

export function DeleteMatchButton({
  tournamentId,
  matchId,
}: {
  tournamentId: number;
  matchId: number;
}) {
  return (
    <form action={deleteMatchAction}>
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="id" value={matchId} />
      <IconSubmit title="Удалить матч" variant="danger">
        Удалить матч
      </IconSubmit>
    </form>
  );
}

/** "Everything is running late" — shifts a whole stage in one submit. */
export function ShiftScheduleForm({
  tournamentId,
  stages,
}: {
  tournamentId: number;
  stages: Stage[];
}) {
  const [state, action] = useActionState(shiftScheduleAction, idle);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="tournament_id" value={tournamentId} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Этап">
          <Select name="stage_id" defaultValue="">
            <option value="">все этапы</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Сдвиг, минут" hint="Отрицательное значение — раньше">
          <Input name="minutes" type="number" defaultValue={30} step={5} />
        </Field>

        <div className="flex items-end">
          <SubmitButton variant="secondary">Сдвинуть</SubmitButton>
        </div>
      </div>

      <Checkbox name="only_unplayed" label="Только не сыгранные матчи" defaultChecked />

      <FormFeedback state={state} />
    </form>
  );
}
