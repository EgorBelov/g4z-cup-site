"use client";

import { useActionState, useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { FormFeedback, SubmitButton } from "@/components/ui/Form";
import {
  saveTournamentAction,
  deleteTournamentAction,
} from "@/lib/actions/tournaments";
import { idle } from "@/lib/actions/state";
import { toDateTimeLocal } from "@/lib/format/date";
import { slugify } from "@/lib/utils/slug";
import type { Tournament } from "@/lib/types/database";

export function TournamentForm({ tournament }: { tournament?: Tournament }) {
  const [state, action] = useActionState(saveTournamentAction, idle);
  const [name, setName] = useState(tournament?.name ?? "");
  const [slug, setSlug] = useState(tournament?.slug ?? "");
  const zone = tournament?.time_zone ?? "Europe/Moscow";

  return (
    <form action={action} className="space-y-5">
      {tournament ? (
        <input type="hidden" name="tournament_id" value={tournament.id} />
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Название" htmlFor="name" error={state.fieldErrors?.name}>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (!tournament) setSlug(slugify(event.target.value));
            }}
            placeholder="G4Z CUP 11"
            required
          />
        </Field>

        <Field
          label="Слаг (адрес страницы)"
          htmlFor="slug"
          hint={`Публичный адрес: /t/${slug || "…"}`}
          error={state.fieldErrors?.slug}
        >
          <Input
            id="slug"
            name="slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="g4z-cup-11"
            required
          />
        </Field>

        <Field
          label="Номер сезона"
          htmlFor="edition"
          error={state.fieldErrors?.edition}
        >
          <Input
            id="edition"
            name="edition"
            type="number"
            min={1}
            defaultValue={tournament?.edition ?? ""}
            placeholder="11"
          />
        </Field>

        <Field
          label="Статус"
          htmlFor="status"
          hint="Черновик не виден на сайте — можно спокойно готовить следующий турнир"
          error={state.fieldErrors?.status}
        >
          <Select
            id="status"
            name="status"
            defaultValue={tournament?.status ?? "draft"}
          >
            <option value="draft">черновик (скрыт)</option>
            <option value="upcoming">анонс</option>
            <option value="live">идёт</option>
            <option value="finished">завершён</option>
          </Select>
        </Field>

        <Field label="Начало" htmlFor="starts_at" error={state.fieldErrors?.starts_at}>
          <Input
            id="starts_at"
            name="starts_at"
            type="datetime-local"
            defaultValue={toDateTimeLocal(tournament?.starts_at ?? null, zone)}
          />
        </Field>

        <Field label="Окончание" htmlFor="ends_at" error={state.fieldErrors?.ends_at}>
          <Input
            id="ends_at"
            name="ends_at"
            type="datetime-local"
            defaultValue={toDateTimeLocal(tournament?.ends_at ?? null, zone)}
          />
        </Field>

        <Field
          label="Часовой пояс"
          htmlFor="time_zone"
          hint="Всё расписание показывается в этом поясе"
          error={state.fieldErrors?.time_zone}
        >
          <Input id="time_zone" name="time_zone" defaultValue={zone} />
        </Field>

        <Field label="Призовой фонд" htmlFor="prize_pool">
          <Input
            id="prize_pool"
            name="prize_pool"
            defaultValue={tournament?.prize_pool ?? ""}
            placeholder="Слава и уважение"
          />
        </Field>

        <Field
          label="Ссылка на стрим"
          htmlFor="stream_url"
          error={state.fieldErrors?.stream_url}
        >
          <Input
            id="stream_url"
            name="stream_url"
            type="url"
            defaultValue={tournament?.stream_url ?? ""}
            placeholder="https://www.twitch.tv/…"
          />
        </Field>

        <Field
          label="Telegram"
          htmlFor="telegram_url"
          error={state.fieldErrors?.telegram_url}
        >
          <Input
            id="telegram_url"
            name="telegram_url"
            type="url"
            defaultValue={tournament?.telegram_url ?? ""}
            placeholder="https://t.me/…"
          />
        </Field>
      </div>

      <Field label="Формат (кратко)" htmlFor="format_summary">
        <Input
          id="format_summary"
          name="format_summary"
          defaultValue={tournament?.format_summary ?? ""}
          placeholder="Круговой групповой этап, плей-офф bo3"
        />
      </Field>

      <Field label="Описание" htmlFor="description">
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={tournament?.description ?? ""}
        />
      </Field>

      <FormFeedback state={state} />

      <div className="flex flex-wrap gap-3">
        <SubmitButton>{tournament ? "Сохранить" : "Создать турнир"}</SubmitButton>
      </div>
    </form>
  );
}

export function DeleteTournamentForm({ tournament }: { tournament: Tournament }) {
  const [state, action] = useActionState(deleteTournamentAction, idle);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="tournament_id" value={tournament.id} />
      <input type="hidden" name="slug" value={tournament.slug} />

      <Field
        label={`Введите «${tournament.slug}», чтобы подтвердить удаление`}
        htmlFor="confirm_slug"
        hint="Удалятся все команды, матчи, карты, драфты и итоги этого турнира."
      >
        <Input id="confirm_slug" name="confirm_slug" placeholder={tournament.slug} />
      </Field>

      <FormFeedback state={state} />

      <SubmitButton variant="danger" pendingLabel="Удаляем…">
        Удалить турнир
      </SubmitButton>
    </form>
  );
}

export function DangerZone({ tournament }: { tournament: Tournament }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-live hover:underline"
      >
        Показать удаление турнира
      </button>
    );
  }

  return <DeleteTournamentForm tournament={tournament} />;
}
