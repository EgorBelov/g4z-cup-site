"use client";

import { useActionState } from "react";
import { Field, Input, Select } from "@/components/ui/Field";
import { FormFeedback, IconSubmit, SubmitButton } from "@/components/ui/Form";
import { idle } from "@/lib/actions/state";
import {
  autoFillPlacementsAction,
  deleteAwardAction,
  deletePlacementAction,
  saveAwardAction,
  savePlacementAction,
} from "@/lib/actions/results";
import type { Award, Placement, Team } from "@/lib/types/database";

export function AutoFillForm({ tournamentId }: { tournamentId: number }) {
  const [state, action] = useActionState(autoFillPlacementsAction, idle);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <p className="text-sm text-ink-muted">
        Заполнит места по результатам финала и таблицы групп. Потом можно поправить
        вручную.
      </p>
      <FormFeedback state={state} />
      <SubmitButton variant="secondary">Заполнить по результатам</SubmitButton>
    </form>
  );
}

export function PlacementForm({
  tournamentId,
  teams,
  placement,
  nextPlace,
}: {
  tournamentId: number;
  teams: Team[];
  placement?: Placement;
  nextPlace?: number;
}) {
  const [state, action] = useActionState(savePlacementAction, idle);

  return (
    <form
      action={action}
      className="grid gap-2 rounded-control border border-edge bg-surface-sunken/60 p-3 sm:grid-cols-[4rem_minmax(0,2fr)_minmax(0,2fr)_auto]"
    >
      <input type="hidden" name="tournament_id" value={tournamentId} />

      <Input
        name="place"
        type="number"
        min={1}
        defaultValue={placement?.place ?? nextPlace ?? 1}
        aria-label="Место"
      />

      <Select
        name="team_id"
        defaultValue={placement?.team_id ?? ""}
        aria-label="Команда"
      >
        <option value="">— команда —</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </Select>

      <Input
        name="note"
        defaultValue={placement?.note ?? ""}
        placeholder="Примечание (Чемпион, Бронза…)"
        aria-label="Примечание"
      />

      <div className="flex items-center gap-2">
        <IconSubmit title="Сохранить место">✓</IconSubmit>
        {state.error ? <span className="text-xs text-live">{state.error}</span> : null}
      </div>
    </form>
  );
}

export function DeletePlacementButton({
  tournamentId,
  placementId,
}: {
  tournamentId: number;
  placementId: number;
}) {
  return (
    <form action={deletePlacementAction}>
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="placement_id" value={placementId} />
      <IconSubmit title="Удалить место" variant="danger">
        ×
      </IconSubmit>
    </form>
  );
}

export function AwardForm({
  tournamentId,
  teams,
  award,
}: {
  tournamentId: number;
  teams: Team[];
  award?: Award;
}) {
  const [state, action] = useActionState(saveAwardAction, idle);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      {award ? <input type="hidden" name="award_id" value={award.id} /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Награда" error={state.fieldErrors?.title}>
          <Input
            name="title"
            defaultValue={award?.title ?? ""}
            placeholder="MVP турнира"
          />
        </Field>
        <Field label="Игрок (ник)">
          <Input name="nickname" defaultValue={award?.nickname ?? ""} />
        </Field>
        <Field label="Команда">
          <Select name="team_id" defaultValue={award?.team_id ?? ""}>
            <option value="">—</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Порядок">
          <Input
            name="sort_order"
            type="number"
            min={0}
            defaultValue={award?.sort_order ?? 1}
          />
        </Field>
      </div>

      <Field label="Примечание">
        <Input name="note" defaultValue={award?.note ?? ""} />
      </Field>

      <FormFeedback state={state} />
      <SubmitButton size="sm">
        {award ? "Сохранить награду" : "Добавить награду"}
      </SubmitButton>
    </form>
  );
}

export function DeleteAwardButton({
  tournamentId,
  awardId,
}: {
  tournamentId: number;
  awardId: number;
}) {
  return (
    <form action={deleteAwardAction}>
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="award_id" value={awardId} />
      <IconSubmit title="Удалить награду" variant="danger">
        ×
      </IconSubmit>
    </form>
  );
}
