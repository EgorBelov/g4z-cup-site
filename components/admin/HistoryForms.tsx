"use client";

import { useActionState, useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { FormFeedback, SubmitButton } from "@/components/ui/Form";
import { idle } from "@/lib/actions/state";
import { addFinishedMatchAction, addTeamsBulkAction } from "@/lib/actions/history";
import type { Group, Stage, Team } from "@/lib/types/database";

export function BulkTeamsForm({
  tournamentId,
  groups,
}: {
  tournamentId: number;
  groups: Group[];
}) {
  const [state, action] = useActionState(addTeamsBulkAction, idle);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="tournament_id" value={tournamentId} />

      <Field
        label="Команды — по одной в строке"
        hint="Уже заведённые названия пропускаются, адреса страниц строятся автоматически"
        error={state.fieldErrors?.names}
      >
        <Textarea
          name="names"
          rows={7}
          placeholder={"Team REHUB\nTeam BLOODY VALENTINE\nTeam PUBLIC\nTeam G4ZIKI"}
        />
      </Field>

      {groups.length > 0 ? (
        <Field label="Сразу в группу" hint="Можно оставить пустым">
          <Select name="group_id" defaultValue="">
            <option value="">без группы</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <FormFeedback state={state} />
      <SubmitButton>Добавить команды</SubmitButton>
    </form>
  );
}

const PRESET_LABELS = ["Финал", "Матч за 3 место", "Полуфинал", "Четвертьфинал"];

/**
 * Records an already-played series from its score. The maps behind it are
 * generated, because the database is the one that computes match scores.
 */
export function FinishedMatchForm({
  tournamentId,
  stages,
  teams,
}: {
  tournamentId: number;
  stages: Stage[];
  teams: Team[];
}) {
  const [state, action] = useActionState(addFinishedMatchAction, idle);
  const [label, setLabel] = useState(PRESET_LABELS[0]!);
  const [score1, setScore1] = useState(2);
  const [score2, setScore2] = useState(1);

  const wins = Math.max(score1, score2);
  const losses = Math.min(score1, score2);
  const seriesHint =
    score1 === score2
      ? "Ничьих не бывает — у кого-то должно быть больше побед"
      : wins > 4
        ? "Максимум 4 победы (bo7)"
        : `Будет создан матч bo${wins * 2 - 1} и ${wins + losses} карт(ы)`;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="tournament_id" value={tournamentId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Что за матч" error={state.fieldErrors?.round_label}>
          <Input
            name="round_label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            list="match-labels"
            required
          />
          <datalist id="match-labels">
            {PRESET_LABELS.map((preset) => (
              <option key={preset} value={preset} />
            ))}
          </datalist>
        </Field>

        <Field
          label="Этап"
          hint="Пусто — положим в «Плей-офф», создадим при необходимости"
        >
          <Select name="stage_id" defaultValue="">
            <option value="">выбрать автоматически</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_5rem_5rem_minmax(0,1fr)] sm:items-end">
        <Field label="Команда 1" error={state.fieldErrors?.team1_id}>
          <Select name="team1_id" defaultValue="" required>
            <option value="" disabled>
              выберите
            </option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Счёт">
          <Input
            name="score1"
            type="number"
            min={0}
            max={4}
            value={score1}
            onChange={(event) => setScore1(Number(event.target.value))}
            aria-label="Счёт команды 1"
          />
        </Field>

        <Field label="Счёт">
          <Input
            name="score2"
            type="number"
            min={0}
            max={4}
            value={score2}
            onChange={(event) => setScore2(Number(event.target.value))}
            aria-label="Счёт команды 2"
          />
        </Field>

        <Field label="Команда 2" error={state.fieldErrors?.team2_id}>
          <Select name="team2_id" defaultValue="" required>
            <option value="" disabled>
              выберите
            </option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <p className="rounded-control border border-edge bg-surface-sunken/60 px-4 py-3 text-sm text-ink-muted">
        {seriesHint}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Когда сыграли" hint="Необязательно">
          <Input name="played_at" type="datetime-local" />
        </Field>
        <Field label="Запись матча" error={state.fieldErrors?.vod_url}>
          <Input
            name="vod_url"
            type="url"
            placeholder="https://www.twitch.tv/videos/…"
          />
        </Field>
      </div>

      <FormFeedback state={state} />
      <SubmitButton>Записать матч</SubmitButton>
    </form>
  );
}
