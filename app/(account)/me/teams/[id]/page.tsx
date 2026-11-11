import { notFound } from "next/navigation";
import {
  CommunityTeamForm,
  CommandForm,
  PlayerSearch,
} from "@/components/player/TeamForms";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { managedTeam } from "@/lib/queries/registration";
import { listTournaments, getPublicCommunityTeam } from "@/lib/queries/public";
import { applicationLabels } from "@/lib/types/registration";
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
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <p className="eyebrow">
            {team.archived
              ? "Команда закрыта"
              : main
                ? "Главный капитан"
                : "Второй капитан"}
          </p>
          <h1 className="page-title mt-3">{team.name}</h1>
        </div>
        <ButtonLink href={`/teams/${team.slug}`} size="sm" variant="secondary">
          Публичная страница ↗
        </ButtonLink>
      </div>
      <Card className="p-5 sm:p-7">
        <h2 className="mb-5 text-2xl">Участия в турнирах</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {tournaments
            .filter(
              (t) =>
                t.registration_open ||
                applications.some((a) => a.tournament_id === t.id),
            )
            .map((t) => {
              const app = applications.find((a) => a.tournament_id === t.id);
              return (
                <div
                  key={t.id}
                  className="rounded-control border border-edge bg-panel p-5"
                >
                  <p className="font-medium">{t.name}</p>
                  <p className="my-3 text-sm text-ink-muted">
                    {t.roster_size} основных + до {t.max_substitutes} запасных
                  </p>
                  {app && app.status !== "withdrawn" ? (
                    <ButtonLink
                      href={`/me/applications/${app.id}`}
                      size="sm"
                      variant="secondary"
                    >
                      {applicationLabels[app.status]} · открыть
                    </ButtonLink>
                  ) : !team.archived && t.registration_open ? (
                    <CommandForm
                      label={app ? "Создать состав заново" : "Создать заявку команды"}
                      variant="primary"
                      fields={{
                        action: "application_create",
                        team_id: team.id,
                        tournament_id: t.id,
                      }}
                    />
                  ) : (
                    <p className="text-sm text-ink-muted">Создание заявки недоступно</p>
                  )}
                </div>
              );
            })}
        </div>
      </Card>
      {!team.archived ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="p-5 sm:p-7">
            <h2 className="mb-5 text-xl">Данные команды</h2>
            <CommunityTeamForm team={team} />
          </Card>
          <Card className="p-5 sm:p-7">
            <h2 className="mb-5 text-xl">Капитаны</h2>
            <p className="text-sm">
              Главный: {publicTeam?.main_captain.nickname ?? "—"}
            </p>
            <p className="mt-3 text-sm">
              Второй: {publicTeam?.second_captain?.nickname ?? "Не назначен"}
            </p>
            {main ? (
              <>
                <div className="mt-6">
                  <PlayerSearch teamId={team.id} teamVersion={team.version} roles />
                </div>
                {team.second_captain ? (
                  <CommandForm
                    className="mt-4"
                    label="Снять второго капитана"
                    fields={{
                      action: "second_remove",
                      team_id: team.id,
                      team_version: team.version,
                    }}
                  />
                ) : null}
                {requests.map((r) => (
                  <div
                    key={r.id}
                    className="mt-4 rounded-control border border-edge p-4"
                  >
                    <p className="mb-3 text-sm">
                      Ожидает подтверждения: {r.role === "main" ? "главный" : "второй"}{" "}
                      капитан
                    </p>
                    <CommandForm
                      label="Отозвать запрос"
                      fields={{ action: "captain_revoke", request_id: r.id }}
                    />
                  </div>
                ))}
              </>
            ) : null}
          </Card>
        </div>
      ) : null}
      {main && !team.archived ? (
        <Card className="p-5">
          <p className="mb-4 text-sm text-ink-muted">
            Закрытие сохраняет историю и адрес. Сначала отзовите непринятые заявки. Для
            восстановления потребуется организатор.
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
        </Card>
      ) : null}
    </div>
  );
}
