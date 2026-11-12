import { notFound } from "next/navigation";
import {
  CommunityTeamForm,
  CommandForm,
  PlayerSearch,
} from "@/components/player/TeamForms";
import { ButtonLink } from "@/components/ui/Button";
import { managedTeam } from "@/lib/queries/registration";
import { listTournaments, getPublicCommunityTeam } from "@/lib/queries/public";
import { applicationLabels, type ApplicationStatus } from "@/lib/types/registration";

function statusTone(status: ApplicationStatus): "ok" | "wait" | "neutral" {
  if (status === "accepted") return "ok";
  if (status === "submitted" || status === "waitlisted" || status === "draft") return "wait";
  return "neutral";
}

function plural(count: number, one: string, few: string, many: string): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

export default async function ManageCommunityTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const { team, player, applications, requests } = await managedTeam(id);
  const [tournaments, publicTeam] = await Promise.all([
    listTournaments(),
    getPublicCommunityTeam(team.slug),
  ]);
  const main = team.main_captain === player.id;

  const visible = tournaments.filter(
    (t) => t.registration_open || applications.some((a) => a.tournament_id === t.id),
  );

  const sub = [
    team.archived ? "команда закрыта" : main ? "главный капитан" : "второй капитан",
    team.tag ?? null,
    `${visible.length} ${plural(visible.length, "турнир", "турнира", "турниров")}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <div className="orbit-page-head">
        <div>
          <h1 className="orbit-page-title">{team.name}</h1>
          <p className="orbit-page-sub">{sub}</p>
        </div>
        <ButtonLink href={`/teams/${team.slug}`} variant="secondary">
          Публичная страница ↗
        </ButtonLink>
      </div>

      <div className="orbit-tm-grid">
        <div className="orbit-tm-main">
          <section className="orbit-app-card orbit-frame">
            <div className="orbit-app-card-head">
              <h2>Участия в турнирах</h2>
              <span>
                {visible.length}{" "}
                {plural(visible.length, "турнир", "турнира", "турниров")}
              </span>
            </div>

            {visible.map((t) => {
              const app = applications.find((a) => a.tournament_id === t.id);
              const applied = app && app.status !== "withdrawn";

              return (
                <div className="orbit-tm-row" key={t.id}>
                  <div className="min-w-0">
                    <b>{t.name}</b>
                    <small>
                      {t.roster_size} основных + до {t.max_substitutes} запасных ·{" "}
                      {t.registration_open ? "приём открыт" : "приём закрыт"}
                    </small>
                  </div>
                  <div className="orbit-tm-side">
                    {applied && app ? (
                      <>
                        <span
                          className="orbit-app-status"
                          data-tone={statusTone(app.status)}
                          style={{ marginTop: 0 }}
                        >
                          {applicationLabels[app.status]}
                        </span>
                        <span className="orbit-app-mini">
                          <ButtonLink href={`/me/applications/${app.id}`} size="sm" variant="ghost">
                            Открыть
                          </ButtonLink>
                        </span>
                      </>
                    ) : !team.archived && t.registration_open ? (
                      <span className="orbit-app-mini" data-accent="true">
                        <CommandForm
                          label={app ? "Создать состав заново" : "Создать заявку"}
                          variant="primary"
                          fields={{
                            action: "application_create",
                            team_id: team.id,
                            tournament_id: t.id,
                          }}
                        />
                      </span>
                    ) : (
                      <span className="orbit-app-status" style={{ marginTop: 0 }}>
                        создание недоступно
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {visible.length === 0 ? (
              <p className="orbit-app-note">
                Пока нет турниров с открытым приёмом. Следите за анонсами.
              </p>
            ) : null}
          </section>

          {!team.archived ? (
            <>
              <section className="orbit-app-card orbit-frame">
                <div className="orbit-app-card-head">
                  <h2>Данные команды</h2>
                  <span>видны публично</span>
                </div>
                <div className="orbit-form-scope">
                  <CommunityTeamForm team={team} />
                </div>
              </section>

              <section className="orbit-app-card orbit-frame">
                <div className="orbit-app-card-head">
                  <h2>Капитаны</h2>
                  <span>роль даёт права на состав</span>
                </div>

                <div className="orbit-tm-row">
                  <b>Главный капитан</b>
                  <span className="orbit-app-status" style={{ marginTop: 0 }}>
                    {publicTeam?.main_captain.nickname ?? "—"}
                    {publicTeam?.main_captain.code ? ` · P${publicTeam.main_captain.code}` : ""}
                  </span>
                </div>
                <div className="orbit-tm-row">
                  <b>Второй капитан</b>
                  <span className="orbit-app-status" style={{ marginTop: 0 }}>
                    {publicTeam?.second_captain
                      ? `${publicTeam.second_captain.nickname}${
                          publicTeam.second_captain.code
                            ? ` · P${publicTeam.second_captain.code}`
                            : ""
                        }`
                      : "не назначен"}
                  </span>
                </div>

                {main ? (
                  <>
                    <div className="orbit-tm-search">
                      <PlayerSearch teamId={team.id} teamVersion={team.version} roles />
                    </div>
                    {team.second_captain ? (
                      <div className="orbit-tm-pending">
                        <span className="orbit-app-mini" data-danger="true">
                          <CommandForm
                            label="Снять второго капитана"
                            fields={{
                              action: "second_remove",
                              team_id: team.id,
                              team_version: team.version,
                            }}
                          />
                        </span>
                      </div>
                    ) : null}
                    {requests.map((r) => (
                      <div className="orbit-tm-pending" key={r.id}>
                        <p>
                          Ожидает подтверждения: {r.role === "main" ? "главный" : "второй"}{" "}
                          капитан
                        </p>
                        <span className="orbit-app-mini">
                          <CommandForm
                            label="Отозвать запрос"
                            fields={{ action: "captain_revoke", request_id: r.id }}
                          />
                        </span>
                      </div>
                    ))}
                  </>
                ) : null}
              </section>
            </>
          ) : null}
        </div>

        <aside className="orbit-tm-aside">
          <section className="orbit-app-card orbit-frame">
            <div className="orbit-app-card-head">
              <h2>Ваша роль</h2>
            </div>
            <div style={{ marginTop: 8 }}>
              <div className="orbit-tm-role">
                <span className="dot" aria-hidden="true" />
                <div>
                  <b>{main ? "Главный капитан" : "Второй капитан"}</b>
                  <span>
                    {main
                      ? "состав, данные команды, капитаны"
                      : "состав и данные команды"}
                  </span>
                </div>
              </div>
              <div className="orbit-tm-role">
                <span className="dot" aria-hidden="true" />
                <div>
                  <b>
                    {applications.length}{" "}
                    {plural(applications.length, "заявка", "заявки", "заявок")}
                  </b>
                  <span>по турнирам, где участвует команда</span>
                </div>
              </div>
              <div className="orbit-tm-role">
                <span className="dot" aria-hidden="true" />
                <div>
                  <b>Публичная страница</b>
                  <span>её видят все, кто нашёл команду</span>
                </div>
              </div>
            </div>
          </section>

          {main && !team.archived ? (
            <section className="orbit-app-card orbit-tm-danger orbit-frame">
              <div className="orbit-app-card-head">
                <h2>Закрытие</h2>
              </div>
              <p>
                Закрытие сохраняет историю и адрес. Сначала отзовите непринятые заявки.
                Для восстановления потребуется организатор.
              </p>
              <CommandForm
                label="Закрыть команду"
                variant="danger"
                fields={{
                  action: "team_archive",
                  team_id: team.id,
                  team_version: team.version,
                }}
              />
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
