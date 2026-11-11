"use client";
import { useActionState, useEffect, useRef } from "react";
import { Field, Input } from "@/components/ui/Field";
import { FormFeedback, SubmitButton } from "@/components/ui/Form";
import { Icon } from "@/components/ui/Icon";
import { idle } from "@/lib/actions/state";
import {
  beginRegistrationAction,
  beginPlayerLoginAction,
  completePlayerAuthAction,
} from "@/lib/actions/player-auth";
import { updatePlayerProfileAction } from "@/lib/actions/registration";
import type { ProfileWithRatings } from "@/lib/types/registration";

type Values = Partial<
  Pick<
    ProfileWithRatings,
    | "nickname"
    | "telegram_username"
    | "steam_url"
    | "faceit_url"
    | "dotabuff_url"
    | "dota_mmr"
    | "cs_elo"
    | "version"
  >
>;
export function ProfileForm({
  values = {},
  next = "/me",
  editing = false,
}: {
  values?: Values;
  next?: string;
  editing?: boolean;
}) {
  const [state, action] = useActionState(
    editing ? updatePlayerProfileAction : beginRegistrationAction,
    idle,
  );
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      {editing ? (
        <input type="hidden" name="version" value={values.version ?? 0} />
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Публичный ник"
          htmlFor="nickname"
          error={state.fieldErrors?.nickname}
        >
          <Input
            id="nickname"
            name="nickname"
            defaultValue={values.nickname ?? ""}
            minLength={2}
            maxLength={80}
            required
            autoComplete="nickname"
            placeholder="Как вас знают в игре"
          />
        </Field>
        <Field
          label="Telegram для связи"
          htmlFor="telegram_username"
          error={state.fieldErrors?.telegram_username}
          hint="Контакт видят только вы и организаторы"
        >
          <Input
            id="telegram_username"
            name="telegram_username"
            defaultValue={values.telegram_username ?? ""}
            maxLength={33}
            required
            placeholder="@username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </Field>
      </div>
      <Field
        label="Ссылка на Steam"
        htmlFor="steam_url"
        error={state.fieldErrors?.steam_url}
        hint="steamcommunity.com/id/… или /profiles/…"
      >
        <Input
          id="steam_url"
          name="steam_url"
          type="url"
          defaultValue={values.steam_url ?? ""}
          required
          maxLength={300}
          placeholder="https://steamcommunity.com/id/…"
        />
      </Field>
      <details
        className="rounded-card border border-edge bg-panel p-5"
        open={editing || undefined}
      >
        <summary className="cursor-pointer text-sm">
          Игровые показатели и дополнительные ссылки{" "}
          <span className="text-ink-muted">· необязательно</span>
        </summary>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field
            label="Dota 2 · MMR"
            htmlFor="dota_mmr"
            error={state.fieldErrors?.dota_mmr}
          >
            <Input
              id="dota_mmr"
              name="dota_mmr"
              type="number"
              min={0}
              max={20000}
              defaultValue={values.dota_mmr ?? ""}
              placeholder="Можно оставить пустым"
            />
          </Field>
          <Field label="CS2 · Elo" htmlFor="cs_elo" error={state.fieldErrors?.cs_elo}>
            <Input
              id="cs_elo"
              name="cs_elo"
              type="number"
              min={0}
              max={20000}
              defaultValue={values.cs_elo ?? ""}
              placeholder="Можно оставить пустым"
            />
          </Field>
          <Field
            label="Faceit"
            htmlFor="faceit_url"
            error={state.fieldErrors?.faceit_url}
          >
            <Input
              id="faceit_url"
              name="faceit_url"
              type="url"
              defaultValue={values.faceit_url ?? ""}
              maxLength={300}
              placeholder="https://www.faceit.com/en/players/…"
            />
          </Field>
          <Field
            label="Dotabuff"
            htmlFor="dotabuff_url"
            error={state.fieldErrors?.dotabuff_url}
          >
            <Input
              id="dotabuff_url"
              name="dotabuff_url"
              type="url"
              defaultValue={values.dotabuff_url ?? ""}
              maxLength={300}
              placeholder="https://www.dotabuff.com/players/…"
            />
          </Field>
        </div>
        <p className="mt-4 text-xs text-ink-muted">
          Рейтинги заявлены вами. Они не являются автоматическим условием допуска.
        </p>
      </details>
      <p className="text-xs leading-relaxed text-ink-muted">
        Ник и игровые показатели могут быть видны в составе и поиске капитанов.
        Telegram, Steam и дополнительные ссылки доступны только вам и организаторам.
        Ссылка на профиль не подтверждает владение им.
      </p>
      <FormFeedback state={state} />
      <SubmitButton
        className="w-full sm:w-auto"
        pendingLabel={editing ? "Сохраняем…" : "Открываем Telegram…"}
      >
        {editing ? null : <Icon name="telegram" />}
        {editing ? "Сохранить профиль" : "Создать аккаунт через Telegram"}
      </SubmitButton>
    </form>
  );
}
export function PlayerLoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(beginPlayerLoginAction, idle);
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />
      <FormFeedback state={state} />
      <SubmitButton pendingLabel="Открываем Telegram…" className="w-full">
        <Icon name="telegram" />
        Войти через Telegram
      </SubmitButton>
    </form>
  );
}
export function CompleteAuthForm() {
  const [state, action, pending] = useActionState(completePlayerAuthAction, idle);
  const form = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);
  useEffect(() => {
    if (!submitted.current) {
      submitted.current = true;
      form.current?.requestSubmit();
    }
  }, []);
  return (
    <form ref={form} action={action} className="space-y-5">
      <p role="status" className="text-sm text-ink-muted">
        {pending ? "Завершаем вход и возвращаем вас на сайт…" : "Подтверждаем аккаунт…"}
      </p>
      <FormFeedback state={state} />
      <SubmitButton pendingLabel="Подождите…">Продолжить</SubmitButton>
    </form>
  );
}
