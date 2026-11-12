import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { CommandForm } from "@/components/player/TeamForms";
import { playerLogoutAction } from "@/lib/actions/player-auth";
import {
  requirePlayer,
  playerTeams,
  playerApplications,
  incomingInvites,
} from "@/lib/queries/player";
import { listTournaments } from "@/lib/queries/public";
import { writeClient } from "@/lib/supabase/write";
import {
  applicationLabels,
  type ApplicationStatus,
  type CommunityTeam,
} from "@/lib/types/registration";

function teamMark(name: string, tag?: string | null): string {
  if (tag) return tag.slice(0, 3).toUpperCase();
  return name
    .replace(/^Team\s+/i, "")
    .slice(0, 2)
    .toUpperCase();
}

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

export default async function MyAccountPage() {
  const player = await requirePlayer();
  const teams = await playerTeams(player.id);
  const [applications, incoming, tournaments] = await Promise.all([
    playerApplications(player.id, teams),
    incomingInvites(player.id),
    listTournaments(),
  ]);
  const client = writeClient();
  const relatedIds = [
    ...new Set([
      ...applications.map((a) => a.community_team_id),
      ...incoming.requests.map((r) => r.community_team_id),
    ]),
  ];
  const otherTeams = relatedIds.length
    ? await client.from("community_teams").select("id,name,slug").in("id", relatedIds)
    : { data: [] };
  const invitations = [];
  for (const invite of incoming.invites) {
    const app = await client
      .from("registration_teams")
      .select("tournament_id,community_team_id")
      .eq("id", invite.registration_team_id)
      .single();
    const team = app.data
      ? await client
          .from("community_teams")
          .select("name")
          .eq("id", app.data.community_team_id)
          .single()
      : null;
    if (app.data && team?.data)
      invitations.push({
        ...invite,
        teamName: team.data.name as string,
        cupName:
          tournaments.find((t) => t.id === app.data.tournament_id)?.name ?? "Турнир",
      });
  }

  const activeTeams = teams.filter((team) => !team.archived);
  const openCups = tournaments.filter(
    (t) => t.registration_open && t.status !== "finished",
  );
  const inviteCount = invitations.length + incoming.requests.length;

  return (
    <div className="orbit-cabinet">
      <div className="orbit-page-head">
        <div>
          <h1 className="orbit-page-title">Кабинет</h1>
          <p className="orbit-page-sub">
            {player.nickname} · P{player.code}
          </p>
        </div>
        <div className="orbit-cabinet-head-actions">
          <ButtonLink href="/me/profile" variant="secondary">
            Мой профиль
          </ButtonLink>
          <form action={playerLogoutAction}>
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-pill border border-edge px-5 text-sm text-ink transition hover:border-edge-strong hover:bg-panel"
              type="submit"
            >
              Выйти
            </button>
          </form>
        </div>
      </div>

      <p className="orbit-cabinet-summary">
        <b>{activeTeams.length}</b> {plural(activeTeams.length, "команда", "команды", "команд")}{" "}
        · <b>{applications.length}</b>{" "}
        {plural(applications.length, "заявка", "заявки", "заявок")} ·{" "}
        <b>{inviteCount}</b> {plural(inviteCount, "приглашение", "приглашения", "приглашений")}
      </p>

      <div className="orbit-cabinet-grid">
        <div className="orbit-cabinet-main">
          <section className="orbit-cabinet-card orbit-frame">
            <div className="orbit-cabinet-card-head">
              <h2>Мои команды</h2>
              <ButtonLink href="/me/teams/new" size="sm" variant="secondary">
                Создать команду
              </ButtonLink>
            </div>
            {teams.length ? (
              <div className="orbit-cabinet-teams">
                {teams.map((team) => (
                  <Link
                    prefetch={false}
                    key={team.id}
                    href={`/me/teams/${team.id}`}
                    className="orbit-cabinet-team"
                  >
                    <span className="mark" aria-hidden="true">
                      {teamMark(team.name, team.tag)}
                    </span>
                    <div className="min-w-0">
                      <b>{team.name}</b>
                      <span>
                        {team.archived
                          ? "закрыта"
                          : team.main_captain === player.id
                            ? "главный капитан"
                            : "второй капитан"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="orbit-cabinet-empty">
                Создайте свою команду или дождитесь приглашения в состав. Права капитана
                сами по себе не занимают игровой слот.
              </p>
            )}
          </section>

          <section className="orbit-cabinet-card orbit-frame">
            <div className="orbit-cabinet-card-head">
              <h2>Мои участия</h2>
            </div>
            {applications.length ? (
              applications.map((application) => (
                <div className="orbit-cabinet-row" key={application.id}>
                  <div className="min-w-0">
                    <small>
                      {tournaments.find((t) => t.id === application.tournament_id)?.name ??
                        "Турнир"}
                    </small>
                    <b>
                      {(
                        otherTeams.data as
                          | Pick<CommunityTeam, "id" | "name" | "slug">[]
                          | null
                      )?.find((t) => t.id === application.community_team_id)?.name ??
                        "Команда"}
                    </b>
                    {application.reason ? (
                      <p className="orbit-cabinet-empty" style={{ marginTop: 6 }}>
                        {application.reason}
                      </p>
                    ) : null}
                  </div>
                  <div className="orbit-cabinet-side">
                    <span
                      className="orbit-cabinet-status"
                      data-tone={statusTone(application.status)}
                    >
                      {applicationLabels[application.status]}
                    </span>
                    <ButtonLink
                      href={`/me/applications/${application.id}`}
                      size="sm"
                      variant="secondary"
                    >
                      Открыть
                    </ButtonLink>
                  </div>
                </div>
              ))
            ) : (
              <p className="orbit-cabinet-empty">
                Вы пока не в турнирном составе. Командную заявку подаёт капитан.
              </p>
            )}
          </section>
        </div>

        <aside className="orbit-cabinet-aside">
          {inviteCount > 0 ? (
            <section className="orbit-cabinet-card orbit-frame">
              <div className="orbit-cabinet-card-head">
                <h2>Приглашения</h2>
              </div>

              {invitations.map((invite) => (
                <div className="orbit-cabinet-row" key={invite.id}>
                  <div className="min-w-0">
                    <small>{invite.cupName}</small>
                    <b>{invite.teamName}</b>
                  </div>
                  <div className="orbit-cabinet-actions">
                    <span className="orbit-cabinet-accept">
                      <CommandForm
                        label="Принять"
                        variant="primary"
                        fields={{ action: "invite_accept", invite_id: invite.id }}
                      />
                    </span>
                    <CommandForm
                      label="Отклонить"
                      fields={{ action: "invite_decline", invite_id: invite.id }}
                    />
                  </div>
                </div>
              ))}

              {incoming.requests.map((request) => (
                <div className="orbit-cabinet-row" key={`role-${request.id}`}>
                  <div className="min-w-0">
                    <small>
                      роль ·{" "}
                      {request.role === "main" ? "главный капитан" : "второй капитан"}
                    </small>
                    <b>
                      {(otherTeams.data as Pick<CommunityTeam, "id" | "name" | "slug">[] | null)?.find(
                        (t) => t.id === request.community_team_id,
                      )?.name ?? "Команда"}
                    </b>
                  </div>
                  <div className="orbit-cabinet-actions">
                    <span className="orbit-cabinet-accept">
                      <CommandForm
                        label="Принять"
                        variant="primary"
                        fields={{ action: "captain_accept", request_id: request.id }}
                      />
                    </span>
                    <CommandForm
                      label="Отклонить"
                      fields={{ action: "captain_decline", request_id: request.id }}
                    />
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          {openCups.length > 0 ? (
            <section className="orbit-cabinet-card orbit-frame">
              <div className="orbit-cabinet-card-head">
                <h2>Следующие кубки</h2>
              </div>
              {openCups.map((cup) => (
                <Link
                  key={cup.id}
                  href={`/t/${cup.slug}/register`}
                  className="orbit-cabinet-cup"
                >
                  {cup.name}
                  <span>участие ↗</span>
                </Link>
              ))}
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
