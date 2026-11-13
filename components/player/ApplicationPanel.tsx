import { ButtonLink } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { CommandForm, PlayerSearch } from "@/components/player/TeamForms";
import { applicationLabels } from "@/lib/types/registration";
import type { applicationDetail } from "@/lib/queries/registration";
import type { ApplicationStatus } from "@/lib/types/registration";

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

function statusTone(status: ApplicationStatus): "ok" | "wait" | "neutral" {
  if (status === "accepted") return "ok";
  if (status === "submitted" || status === "waitlisted" || status === "draft")
    return "wait";
  return "neutral";
}

function initials(value: string): string {
  return value
    .replace(/^Team\s+/i, "")
    .slice(0, 2)
    .toUpperCase();
}

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
  const selfInRoster = Boolean(
    player && members.some((m) => m.profile_id === player.id),
  );

  return (
    <div className="orbit-app">
      <dl className="orbit-app-facts orbit-frame">
        <div>
          <dt>Основные</dt>
          <dd>
            {main} <small>/ {t.roster_size}</small>
          </dd>
        </div>
        <div>
          <dt>Запасные</dt>
          <dd>
            {members.length - main} <small>/ {t.max_substitutes}</small>
          </dd>
        </div>
        <div>
          <dt>Приём заявок</dt>
          <dd style={{ fontSize: 18 }}>{t.registration_open ? "открыт" : "закрыт"}</dd>
        </div>
      </dl>

      <div className="orbit-app-grid">
        <div className="orbit-app-main">
          <section className="orbit-app-card orbit-frame">
            <div className="orbit-app-card-head">
              <h2>Состав</h2>
              <span>приглашение не занимает место</span>
            </div>

            {members.length ? (
              members.map((m) => (
                <div className="orbit-member" key={m.id}>
                  <span className="mark" aria-hidden="true">
                    {initials(m.nickname)}
                  </span>
                  <div className="min-w-0">
                    <b>{m.nickname}</b>
                    <small>
                      {m.slot === "main" ? <em>основной</em> : "запасной"} ·{" "}
                      {t.discipline === "dota2" && m.dota_mmr != null
                        ? `${m.dota_mmr} MMR`
                        : t.discipline === "cs2" && m.cs_elo != null
                          ? `${m.cs_elo} Elo`
                          : "рейтинг не указан"}
                    </small>
                  </div>
                  {editable ? (
                    <div className="orbit-app-row-actions">
                      <span className="orbit-app-mini">
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
                      </span>
                      <span className="orbit-app-mini" data-danger="true">
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
                      </span>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="orbit-app-note">
                Пока никого. Пригласите игроков или займите слот сами.
              </p>
            )}

            {captain && !locked && !selfInRoster ? (
              <div className="orbit-app-slot-actions">
                <span className="orbit-app-mini">
                  <CommandForm
                    label="Занять слот самому"
                    fields={{ ...fields, action: "self_join" }}
                  />
                </span>
              </div>
            ) : null}

            {!locked && selfInRoster ? (
              <div className="orbit-app-slot-actions">
                <span className="orbit-app-mini" data-danger="true">
                  <CommandForm
                    label="Выйти из состава"
                    variant="ghost"
                    fields={{ ...fields, action: "member_leave" }}
                  />
                </span>
              </div>
            ) : null}
          </section>

          {editable ? (
            <section className="orbit-app-card orbit-frame">
              <div className="orbit-app-card-head">
                <h2>
                  {admin ? "Добавить или переместить игрока" : "Пригласить игрока"}
                </h2>
              </div>
              <div className="orbit-app-search">
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
              </div>
              {admin ? (
                <p className="orbit-app-note">
                  Если игрок уже в другом составе этого кубка, организатор переместит
                  его одной операцией. Подтверждение игрока не требуется.
                </p>
              ) : null}
            </section>
          ) : null}

          {editable && !admin ? (
            <section className="orbit-app-card orbit-frame">
              <div className="orbit-app-card-head">
                <h2>Приглашения</h2>
                <span>ссылка живёт 7 дней</span>
              </div>

              <div
                className="orbit-app-slot-actions"
                style={{ borderTop: 0, paddingTop: 0 }}
              >
                <span className="orbit-app-mini" data-accent="true">
                  <CommandForm
                    label="Создать новую ссылку"
                    fields={{ ...fields, action: "invite_create" }}
                  />
                </span>
              </div>

              <p className="orbit-app-note">
                Ссылка многоразовая, действует 7 дней. Новая отключает предыдущую;
                свободные места проверяются при каждом вступлении.
              </p>

              {invites.map((i) => (
                <div className="orbit-app-invite" key={i.id}>
                  <div className="min-w-0">
                    <b>
                      {i.recipient_id ? "Персональное приглашение" : "Ссылка в состав"}
                    </b>
                    <small>
                      до{" "}
                      {new Date(i.expires_at as string).toLocaleDateString("ru-RU", {
                        timeZone: t.time_zone,
                      })}
                    </small>
                  </div>
                  <span className="orbit-app-mini">
                    <CommandForm
                      label="Отозвать"
                      fields={{
                        ...fields,
                        action: "invite_revoke",
                        invite_id: i.id as number,
                      }}
                    />
                  </span>
                </div>
              ))}
            </section>
          ) : null}
        </div>

        <aside className="orbit-app-aside">
          <section className="orbit-app-card orbit-frame">
            <div className="orbit-app-card-head">
              <h2>Статус</h2>
            </div>

            <span className="orbit-app-status" data-tone={statusTone(r.status)}>
              {applicationLabels[r.status]}
            </span>

            {r.reason ? (
              <p className="orbit-app-reason">Решение организатора: {r.reason}</p>
            ) : null}

            {locked && !admin ? (
              <p className="orbit-app-note">
                Самостоятельное изменение состава сейчас недоступно. Изменения проводит
                организатор.
              </p>
            ) : null}

            <div className="orbit-app-actions">
              {captain && r.status !== "accepted" && r.status !== "withdrawn" ? (
                <>
                  {!locked ? (
                    <span
                      className="orbit-app-mini"
                      data-accent="true"
                      data-block="true"
                    >
                      <CommandForm
                        label="Подать заявку"
                        variant="primary"
                        fields={{ ...fields, action: "submit" }}
                      />
                    </span>
                  ) : null}
                  <span className="orbit-app-mini orbit-app-withdraw" data-block="true">
                    <CommandForm
                      label="Отозвать заявку"
                      variant="danger"
                      fields={{ ...fields, action: "withdraw" }}
                    />
                  </span>
                </>
              ) : null}
              {captain ? (
                <ButtonLink href={`/me/teams/${team.id}`} size="sm" variant="secondary">
                  Управление командой
                </ButtonLink>
              ) : null}
            </div>
          </section>

          {admin && ["submitted", "waitlisted", "rejected"].includes(r.status) ? (
            <section className="orbit-app-card orbit-frame">
              <div className="orbit-app-card-head">
                <h2>Решение организатора</h2>
              </div>
              <div className="orbit-app-search">
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
              </div>
            </section>
          ) : null}

          {events.length ? (
            <section className="orbit-app-card orbit-frame">
              <div className="orbit-app-card-head">
                <h2>История</h2>
                <span>
                  {events.length}{" "}
                  {events.length === 1
                    ? "событие"
                    : events.length < 5
                      ? "события"
                      : "событий"}
                </span>
              </div>
              <div style={{ marginTop: 8 }}>
                {events.map((e) => (
                  <div className="orbit-app-event" key={e.id as number}>
                    <span className="dot" aria-hidden="true" />
                    <div>
                      <b>{eventNames[String(e.action)] ?? "Данные заявки изменены"}</b>
                      <span>
                        {e.actor_kind === "admin" ? "организатор" : "участник"}
                        {e.reason ? ` · ${String(e.reason)}` : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
