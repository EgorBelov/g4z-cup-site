"use client";

import { useActionState, useState } from "react";
import { Checkbox, Field, Input, Select } from "@/components/ui/Field";
import { FormFeedback, IconSubmit, SubmitButton } from "@/components/ui/Form";
import { Card, CardHeader } from "@/components/ui/Card";
import { idle } from "@/lib/actions/state";
import {
  autoSeedGroupsAction,
  deleteGroupAction,
  deleteStageAction,
  generateStageAction,
  generateSwissRoundAction,
  saveGroupAction,
  saveStageAction,
} from "@/lib/actions/structure";
import { bracketSize, roundRobinMatchCount } from "@/lib/brackets";
import type { Group, Stage, StageKind } from "@/lib/types/database";

const kindLabels: Record<StageKind, string> = {
  round_robin: "Круговая (каждый с каждым)",
  swiss: "Швейцарка",
  single_elim: "Плей-офф (одно поражение)",
  double_elim: "Плей-офф (двойное выбывание)",
};

export function StageForm({
  tournamentId,
  stage,
  nextOrder,
}: {
  tournamentId: number;
  stage?: Stage;
  nextOrder?: number;
}) {
  const [state, action] = useActionState(saveStageAction, idle);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      {stage ? <input type="hidden" name="stage_id" value={stage.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Название этапа" error={state.fieldErrors?.name}>
          <Input
            name="name"
            defaultValue={stage?.name ?? ""}
            placeholder="Групповой этап"
            required
          />
        </Field>

        <Field label="Тип" error={state.fieldErrors?.kind}>
          <Select name="kind" defaultValue={stage?.kind ?? "round_robin"}>
            {Object.entries(kindLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Порядок" error={state.fieldErrors?.sort_order}>
          <Input
            name="sort_order"
            type="number"
            min={0}
            defaultValue={stage?.sort_order ?? nextOrder ?? 1}
          />
        </Field>

        <Field label="Серия по умолчанию" error={state.fieldErrors?.best_of}>
          <Select name="best_of" defaultValue={String(stage?.best_of ?? 1)}>
            {[1, 2, 3, 5, 7].map((value) => (
              <option key={value} value={value}>
                bo{value}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Сколько проходит дальше"
          hint="Для групп: подсветит проходную зону в таблице"
          error={state.fieldErrors?.advance_count}
        >
          <Input
            name="advance_count"
            type="number"
            min={0}
            defaultValue={stage?.advance_count ?? ""}
          />
        </Field>
      </div>

      <FormFeedback state={state} />
      <SubmitButton>{stage ? "Сохранить этап" : "Добавить этап"}</SubmitButton>
    </form>
  );
}

export function GroupForm({
  tournamentId,
  stageId,
  group,
  nextOrder,
}: {
  tournamentId: number;
  stageId: number;
  group?: Group;
  nextOrder?: number;
}) {
  const [state, action] = useActionState(saveGroupAction, idle);

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="stage_id" value={stageId} />
      {group ? <input type="hidden" name="group_id" value={group.id} /> : null}

      <Field label="Группа" className="min-w-40 flex-1">
        <Input
          name="name"
          defaultValue={group?.name ?? ""}
          placeholder="Группа B"
          required
        />
      </Field>

      <Field label="Порядок" className="w-24">
        <Input
          name="sort_order"
          type="number"
          min={0}
          defaultValue={group?.sort_order ?? nextOrder ?? 1}
        />
      </Field>

      <SubmitButton size="sm" variant="secondary">
        {group ? "Сохранить" : "Добавить"}
      </SubmitButton>

      {state.error ? <p className="w-full text-xs text-live">{state.error}</p> : null}
    </form>
  );
}

export function DeleteGroupButton({
  tournamentId,
  groupId,
}: {
  tournamentId: number;
  groupId: number;
}) {
  return (
    <form action={deleteGroupAction}>
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="id" value={groupId} />
      <IconSubmit title="Удалить группу" variant="danger">
        ×
      </IconSubmit>
    </form>
  );
}

export function DeleteStageButton({
  tournamentId,
  stageId,
}: {
  tournamentId: number;
  stageId: number;
}) {
  return (
    <form action={deleteStageAction}>
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="id" value={stageId} />
      <IconSubmit title="Удалить этап вместе с матчами" variant="danger">
        Удалить этап
      </IconSubmit>
    </form>
  );
}

/**
 * The generator. One form replaces an evening of manual match creation: it
 * builds the whole schedule or bracket and wires progression.
 */
export function GenerateStageForm({
  tournamentId,
  stage,
  groups,
  teamCount,
  groupTeamCounts,
  existingMatches,
}: {
  tournamentId: number;
  stage: Stage;
  groups: Group[];
  teamCount: number;
  groupTeamCounts: Record<number, number>;
  existingMatches: number;
}) {
  const [state, action] = useActionState(generateStageAction, idle);
  const [groupId, setGroupId] = useState(groups[0]?.id ?? 0);
  const [entrantSource, setEntrantSource] = useState<"seed" | "standings">("standings");

  const isGroupStage = stage.kind === "round_robin" || stage.kind === "swiss";
  const entrants = isGroupStage ? (groupTeamCounts[groupId] ?? 0) : teamCount;

  const preview = (() => {
    if (entrants < 2) return "Недостаточно команд";
    switch (stage.kind) {
      case "round_robin":
        return `${roundRobinMatchCount(entrants)} матчей, ${
          entrants % 2 === 0 ? entrants - 1 : entrants
        } туров`;
      case "swiss":
        return `${Math.floor(entrants / 2)} матчей в первом туре`;
      case "single_elim":
        return `сетка на ${bracketSize(entrants)} мест, ${entrants} участников`;
      case "double_elim":
        return `${entrants * 2 - 2} матчей (верхняя + нижняя сетка)`;
    }
  })();

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="stage_id" value={stage.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        {isGroupStage ? (
          <Field label="Группа">
            <Select
              name="group_id"
              value={groupId}
              onChange={(event) => setGroupId(Number(event.target.value))}
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} — команд: {groupTeamCounts[group.id] ?? 0}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <>
            <Field
              label="Откуда берём участников"
              hint="Из таблицы групп — с учётом «сколько проходит дальше»"
            >
              <Select
                name="entrant_source"
                value={entrantSource}
                onChange={(event) =>
                  setEntrantSource(event.target.value as "seed" | "standings")
                }
              >
                <option value="standings">по итогам групп</option>
                <option value="seed">по посеву команд</option>
              </Select>
            </Field>
            <Field label="Ограничить число участников" hint="Пусто — брать всех">
              <Input name="entrant_limit" type="number" min={2} placeholder="8" />
            </Field>
          </>
        )}

        <Field label="Формат серии">
          <Select name="best_of" defaultValue={String(stage.best_of)}>
            {/* bo2 can end 1:1, so it belongs to a group table, not a bracket. */}
            {(isGroupStage ? [1, 2, 3, 5, 7] : [1, 3, 5, 7]).map((value) => (
              <option key={value} value={value}>
                bo{value}
              </option>
            ))}
          </Select>
        </Field>

        {!isGroupStage ? (
          <Field label="Формат финала" hint="Пусто — как у остальных матчей">
            <Select name="final_best_of" defaultValue="">
              <option value="">как у этапа</option>
              {[1, 3, 5, 7].map((value) => (
                <option key={value} value={value}>
                  bo{value}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <Field label="Начало первого тура">
          <Input name="start_at" type="datetime-local" />
        </Field>

        <Field label="Интервал между турами, мин">
          <Input name="round_gap_minutes" type="number" min={0} defaultValue={60} />
        </Field>
      </div>

      <div className="space-y-2">
        {stage.kind === "single_elim" ? (
          <Checkbox name="third_place" label="Добавить матч за 3 место" />
        ) : null}
        <Checkbox
          name="replace_existing"
          label={`Заменить существующие матчи этапа${
            existingMatches ? ` (сейчас ${existingMatches})` : ""
          }`}
        />
      </div>

      <p className="rounded-control border border-edge bg-surface-sunken/60 px-4 py-3 text-sm text-ink-muted">
        Будет создано: <span className="font-semibold text-ink">{preview}</span>
      </p>

      <FormFeedback state={state} />

      <SubmitButton pendingLabel="Строим сетку…">Сгенерировать матчи</SubmitButton>
    </form>
  );
}

export function SwissRoundForm({
  tournamentId,
  stage,
  groups,
}: {
  tournamentId: number;
  stage: Stage;
  groups: Group[];
}) {
  const [state, action] = useActionState(generateSwissRoundAction, idle);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="stage_id" value={stage.id} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Группа">
          <Select name="group_id" defaultValue={groups[0]?.id}>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Формат серии">
          <Select name="best_of" defaultValue={String(stage.best_of)}>
            {[1, 2, 3, 5, 7].map((value) => (
              <option key={value} value={value}>
                bo{value}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Время тура">
          <Input name="start_at" type="datetime-local" />
        </Field>
      </div>

      <FormFeedback state={state} />
      <SubmitButton variant="secondary">Сформировать следующий тур</SubmitButton>
    </form>
  );
}

export function AutoSeedForm({
  tournamentId,
  stageId,
}: {
  tournamentId: number;
  stageId: number;
}) {
  const [state, action] = useActionState(autoSeedGroupsAction, idle);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="stage_id" value={stageId} />
      <FormFeedback state={state} />
      <SubmitButton variant="secondary" size="sm">
        Разбросать команды по группам (по посеву)
      </SubmitButton>
    </form>
  );
}

export function StageCreator({
  tournamentId,
  nextOrder,
}: {
  tournamentId: number;
  nextOrder: number;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <SubmitButtonShim onClick={() => setOpen(true)}>Добавить этап</SubmitButtonShim>
    );
  }

  return (
    <Card>
      <CardHeader title="Новый этап" />
      <div className="p-5">
        <StageForm tournamentId={tournamentId} nextOrder={nextOrder} />
      </div>
    </Card>
  );
}

function SubmitButtonShim({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-control bg-accent px-4 py-2.5 text-sm font-medium text-surface transition hover:bg-accent/85"
    >
      {children}
    </button>
  );
}
