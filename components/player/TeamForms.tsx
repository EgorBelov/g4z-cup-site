"use client";
import { useActionState, type ReactNode } from "react";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { FormFeedback, SubmitButton } from "@/components/ui/Form";
import { idle } from "@/lib/actions/state";
import {
  saveCommunityTeamAction,
  adminSaveCommunityTeamAction,
  playerRegistrationCommandAction,
  adminRegistrationCommandAction,
  searchPlayersAction,
  adminSearchPlayersAction,
  type RegistrationState,
} from "@/lib/actions/registration";
import type { CommunityTeam } from "@/lib/types/registration";

export function CommunityTeamForm({
  team,
  admin = false,
}: {
  team?: CommunityTeam;
  admin?: boolean;
}) {
  const [state, action] = useActionState(
    admin ? adminSaveCommunityTeamAction : saveCommunityTeamAction,
    idle,
  );
  return (
    <form action={action} className="space-y-5">
      {team ? (
        <>
          <input type="hidden" name="team_id" value={team.id} />
          <input type="hidden" name="team_version" value={team.version} />
        </>
      ) : null}
      <Field
        label="Название команды"
        htmlFor="team_name"
        error={state.fieldErrors?.name}
      >
        <Input
          id="team_name"
          name="name"
          defaultValue={team?.name ?? ""}
          minLength={2}
          maxLength={80}
          required
        />
      </Field>
      <Field label="Тег" htmlFor="team_tag" error={state.fieldErrors?.tag}>
        <Input
          id="team_tag"
          name="tag"
          defaultValue={team?.tag ?? ""}
          maxLength={12}
          placeholder="До 12 символов"
        />
      </Field>
      <Field
        label="Описание"
        htmlFor="team_description"
        error={state.fieldErrors?.description}
      >
        <Textarea
          id="team_description"
          name="description"
          defaultValue={team?.description ?? ""}
          maxLength={2000}
        />
      </Field>
      <FormFeedback state={state} />
      <SubmitButton>{team ? "Сохранить команду" : "Создать команду"}</SubmitButton>
    </form>
  );
}
export function CommandForm({
  fields,
  label,
  children,
  admin = false,
  variant = "secondary",
  className = "",
  pendingLabel = "Сохраняем…",
}: {
  fields: Record<string, string | number | boolean | null>;
  label: string;
  children?: ReactNode;
  admin?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  className?: string;
  pendingLabel?: string;
}) {
  const [state, action] = useActionState<RegistrationState, FormData>(
    admin ? adminRegistrationCommandAction : playerRegistrationCommandAction,
    idle,
  );
  return (
    <form action={action} className={`space-y-3 ${className}`}>
      {Object.entries(fields).map(([name, value]) =>
        value == null ? null : (
          <input key={name} type="hidden" name={name} value={String(value)} />
        ),
      )}
      {children}
      <FormFeedback state={state} />
      {state.inviteUrl ? (
        <div className="rounded-control border border-accent/40 bg-accent-soft p-4">
          <p className="mb-2 text-sm">Ссылка для игроков · 7 дней</p>
          <input
            aria-label="Ссылка-приглашение"
            className="w-full min-w-0 rounded-control border border-edge bg-surface p-3 text-xs text-ink"
            readOnly
            value={state.inviteUrl}
            onFocus={(e) => e.currentTarget.select()}
          />
          <a href={state.inviteUrl} className="mt-2 inline-block text-sm underline">
            Открыть приглашение
          </a>
        </div>
      ) : null}
      <SubmitButton size="sm" variant={variant} pendingLabel={pendingLabel}>
        {label}
      </SubmitButton>
    </form>
  );
}
export function PlayerSearch({
  teamId,
  applicationId,
  version,
  teamVersion,
  admin = false,
  roles = false,
  replaceMembers = [],
}: {
  teamId: number;
  applicationId?: number;
  version?: number;
  teamVersion?: number;
  admin?: boolean;
  roles?: boolean;
  replaceMembers?: { id: string; nickname: string }[];
}) {
  const [state, action] = useActionState<RegistrationState, FormData>(
    admin ? adminSearchPlayersAction : searchPlayersAction,
    idle,
  );
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3">
        <input type="hidden" name="team_id" value={teamId} />
        <Field
          label="Ник или код игрока"
          htmlFor={`search-${roles ? "captains" : "members"}`}
        >
          <Input
            id={`search-${roles ? "captains" : "members"}`}
            name="query"
            minLength={2}
            maxLength={80}
            required
            placeholder="Ник или P123"
          />
        </Field>
        <FormFeedback state={state} />
        <SubmitButton size="sm" pendingLabel="Ищем…">
          Найти игрока
        </SubmitButton>
      </form>
      {state.players?.length === 0 ? (
        <p className="text-sm text-ink-muted">Игроки не найдены</p>
      ) : null}
      {state.players?.map((p) => (
        <div key={p.id} className="rounded-control border border-edge bg-panel p-4">
          <p className="font-medium">
            {p.nickname} <span className="text-xs text-ink-muted">P{p.code}</span>
          </p>
          <p className="mt-2 text-xs text-ink-muted">
            {[
              p.dota_mmr == null ? null : `Dota 2 · ${p.dota_mmr} MMR`,
              p.cs_elo == null ? null : `CS2 · ${p.cs_elo} Elo`,
            ]
              .filter(Boolean)
              .join(" / ") || "Рейтинги не указаны"}
          </p>
          <CommandForm
            admin={admin}
            label={
              roles
                ? admin
                  ? "Назначить напрямую"
                  : "Предложить роль"
                : admin
                  ? "Добавить в состав"
                  : "Пригласить"
            }
            fields={
              roles
                ? {
                    action: admin ? "captain_direct" : "captain_request",
                    team_id: teamId,
                    team_version: teamVersion ?? 0,
                    recipient_id: p.id,
                  }
                : {
                    action: admin ? "admin_member" : "invite_create",
                    application_id: applicationId ?? null,
                    version: version ?? 0,
                    ...(admin ? { profile_id: p.id } : { recipient_id: p.id }),
                  }
            }
            className="mt-3"
          >
            {roles ? (
              <Select aria-label="Роль капитана" name="role">
                <option value="second">Второй капитан</option>
                <option value="main">Главный капитан</option>
              </Select>
            ) : admin ? (
              <Select aria-label="Слот игрока" name="slot">
                <option value="main">Основной</option>
                <option value="substitute">Запасной</option>
              </Select>
            ) : null}
            {admin ? (
              <Input
                aria-label="Причина изменения"
                name="reason"
                required
                maxLength={1000}
                placeholder="Причина изменения организатором"
              />
            ) : null}
            {admin && !roles && replaceMembers.length ? (
              <Select name="replace_profile_id" aria-label="Кого заменить">
                <option value="">Добавить без замены</option>
                {replaceMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    Заменить {m.nickname}
                  </option>
                ))}
              </Select>
            ) : null}
          </CommandForm>
        </div>
      ))}
    </div>
  );
}
