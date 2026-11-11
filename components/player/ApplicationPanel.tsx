import { ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { CommandForm, PlayerSearch } from "@/components/player/TeamForms";
import { applicationLabels } from "@/lib/types/registration";
import type { applicationDetail } from "@/lib/queries/registration";

const eventNames: Record<string, string> = {
  application_create: "Создана командная заявка",
  self_join: "Капитан занял игровой слот",
  invite_create: "Отправлено приглашение",
  invite_accept: "Игрок принял приглашение",
  invite_decline: "Приглашение отклонено",
  invite_revoke: "Приглашение отозвано",
  member_slot: "Изменён тип игрового слота",
  member_remove: "Игрок исключён из состава",
  member_leave: "Игрок вышел из состава",
  admin_member: "Организатор изменил состав",
  admin_move: "Организатор переместил игрока",
  submit: "Заявка подана на рассмотрение",
  withdraw: "Заявка отозвана",
  review: "Решение по заявке",
  captain_request: "Предложена роль капитана",
  captain_direct: "Организатор назначил капитана",
  captain_accept: "Роль капитана принята",
  captain_decline: "Роль капитана отклонена",
  captain_revoke: "Предложение роли отозвано",
  second_remove: "Второй капитан снят",
  team_update: "Обновлены данные команды",
  team_archive: "Команда закрыта",
  team_restore: "Команда восстановлена",
  profile_update: "Обновлён профиль игрока",
};

export function ApplicationPanel({
  data,
  admin = false,
}: {
  data: Awaited<ReturnType<typeof applicationDetail>>;
  admin?: boolean;
}) {
  const {
    application: r,
    team,
    tournament: t,
    members,
    player,
    captain,
    invites,
    events,
  } = data;
  const locked =
    !t.registration_open ||
    r.status === "accepted" ||
    r.status === "withdrawn" ||
    team.archived ||
    t.status === "finished";
  const editable = admin || (captain && !locked);
  const fields = { application_id: r.id, version: r.version };
  const main = members.filter((m) => m.slot === "main").length;
  return (
    <div className="space-y-5">
      <Card className="p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{t.name}</p>
            <h2 className="mt-2 text-2xl">{team.name}</h2>
            <p className="mt-3 inline-flex rounded-pill bg-accent-soft px-4 py-2 text-sm text-accent">
              {applicationLabels[r.status]}
            </p>
          </div>
          <ButtonLink href={`/teams/${team.slug}`} variant="secondary" size="sm">
            Страница команды ↗
          </ButtonLink>
        </div>
        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <span className="rounded-control border border-edge px-4 py-3">
            Основные: {main}/{t.roster_size}
          </span>
          <span className="rounded-control border border-edge px-4 py-3">
            Запасные: {members.length - main}/{t.max_substitutes}
          </span>
          <span className="rounded-control border border-edge px-4 py-3">
            {t.registration_open ? "Приём открыт" : "Приём закрыт"}
          </span>
        </div>
        {r.reason ? (
          <p className="mt-5 rounded-control border border-edge bg-panel p-4 text-sm">
            Решение организатора: {r.reason}
          </p>
        ) : null}
        {locked && !admin ? (
          <p className="mt-5 text-sm text-ink-muted">
            Самостоятельное изменение состава сейчас недоступно. Изменения проводит
            организатор.
          </p>
        ) : null}
        {captain ? (
          <ButtonLink
            className="mt-5"
            href={`/me/teams/${team.id}`}
            size="sm"
            variant="secondary"
          >
            Управление командой
          </ButtonLink>
        ) : null}
      </Card>
      <Card>
        <CardHeader
          title="Состав"
          hint="Приглашение не занимает место. Игрок вступает после подтверждения."
        />
        <div className="space-y-3 p-5">
          {!members.length ? (
            <p className="text-sm text-ink-muted">
              Пока никого. Пригласите игроков или займите слот сами.
            </p>
          ) : (
            members.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-control border border-edge bg-panel p-4"
              >
                <div>
                  <p className="font-medium">
                    {m.nickname}{" "}
                    <span className="text-xs text-ink-muted">P{m.code}</span>
                  </p>
                  <p className="mt-2 text-xs text-ink-muted">
                    {m.slot === "main" ? "Основной" : "Запасной"}
                    {t.discipline === "dota2" && m.dota_mmr != null
                      ? ` · ${m.dota_mmr} MMR`
                      : t.discipline === "cs2" && m.cs_elo != null
                        ? ` · ${m.cs_elo} Elo`
                        : " · рейтинг не указан"}
                  </p>
                </div>
                {editable ? (
                  <div className="flex flex-wrap gap-2">
                    <CommandForm
                      admin={admin}
                      label={m.slot === "main" ? "В запас" : "В основные"}
                      fields={{
                        ...fields,
                        action: "member_slot",
                        profile_id: m.profile_id,
                        slot: m.slot === "main" ? "substitute" : "main",
                      }}
                    />
                    <CommandForm
                      admin={admin}
                      label="Исключить"
                      variant="danger"
                      fields={{
                        ...fields,
                        action: "member_remove",
                        profile_id: m.profile_id,
                      }}
                    />
                  </div>
                ) : null}
              </div>
            ))
          )}
          {captain && !locked && !members.some((m) => m.profile_id === player?.id) ? (
            <CommandForm
              label="Занять слот самому"
              fields={{ ...fields, action: "self_join" }}
            />
          ) : null}
          {!locked && player && members.some((m) => m.profile_id === player.id) ? (
            <CommandForm
              label="Выйти из состава"
              variant="ghost"
              fields={{ ...fields, action: "member_leave" }}
            />
          ) : null}
        </div>
      </Card>
      {editable ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="mb-5 text-xl">
              {admin ? "Добавить или переместить игрока" : "Пригласить игрока"}
            </h2>
            <PlayerSearch
              teamId={team.id}
              applicationId={r.id}
              version={r.version}
              admin={admin}
              replaceMembers={members.map((m) => ({
                id: m.profile_id,
                nickname: m.nickname,
              }))}
            />
            {admin ? (
              <p className="mt-4 text-xs text-ink-muted">
                Если игрок уже в другом составе этого кубка, организатор переместит его
                одной операцией. Подтверждение игрока не требуется.
              </p>
            ) : null}
          </Card>
          {!admin ? (
            <Card className="p-5">
              <h2 className="mb-5 text-xl">Пригласить по ссылке</h2>
              <CommandForm
                label="Создать новую ссылку"
                fields={{ ...fields, action: "invite_create" }}
              />
              <p className="mt-4 text-xs text-ink-muted">
                Ссылка многоразовая, действует 7 дней. Новая отключает предыдущую;
                свободные места проверяются при каждом вступлении.
              </p>
              {invites.map((i) => (
                <div key={i.id} className="mt-4 rounded-control border border-edge p-4">
                  <p className="mb-3 text-sm">
                    {i.recipient_id ? "Персональное приглашение" : "Ссылка в состав"} ·
                    до{" "}
                    {new Date(i.expires_at as string).toLocaleDateString("ru-RU", {
                      timeZone: t.time_zone,
                    })}
                  </p>
                  <CommandForm
                    label="Отозвать"
                    fields={{
                      ...fields,
                      action: "invite_revoke",
                      invite_id: i.id as number,
                    }}
                  />
                </div>
              ))}
            </Card>
          ) : null}
        </div>
      ) : null}
      {captain && r.status !== "accepted" && r.status !== "withdrawn" ? (
        <Card className="flex flex-wrap gap-4 p-5">
          {!locked ? (
            <CommandForm
              label="Подать заявку"
              variant="primary"
              fields={{ ...fields, action: "submit" }}
            />
          ) : null}
          <CommandForm
            label="Отозвать заявку"
            variant="danger"
            fields={{ ...fields, action: "withdraw" }}
          />
        </Card>
      ) : null}
      {admin && ["submitted", "waitlisted", "rejected"].includes(r.status) ? (
        <Card className="p-5">
          <h2 className="mb-5 text-xl">Решение организатора</h2>
          <CommandForm
            admin
            label="Сохранить решение"
            variant="primary"
            fields={{ ...fields, action: "review" }}
          >
            <Select name="status" aria-label="Решение по заявке">
              <option value="accepted">Принять</option>
              <option value="waitlisted">Лист ожидания</option>
              <option value="rejected">Отклонить</option>
            </Select>
            <Input
              name="reason"
              aria-label="Причина решения"
              maxLength={1000}
              placeholder="Причина — обязательна при отказе"
            />
          </CommandForm>
        </Card>
      ) : null}
      {events.length ? (
        <Card className="p-5">
          <h2 className="text-xl">История изменений</h2>
          <ul className="mt-4 space-y-3">
            {events.map((e) => (
              <li
                key={e.id as number}
                className="rounded-control border border-edge p-3 text-sm"
              >
                <span className="text-ink-muted">
                  {e.actor_kind === "admin" ? "Организатор" : "Участник"} ·{" "}
                  {eventNames[String(e.action)] ?? "Данные заявки изменены"}
                </span>
                {e.reason ? <p className="mt-2">{String(e.reason)}</p> : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
