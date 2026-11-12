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

function initials(value: string): string {
  return value
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
  const role = activeTeams.some((team) => team.main_captain === player.id)
    ? "главный капитан"
    : activeTeams.length
      ? "второй капитан"
      : "участник";

  return (
    <div className="orbit-cab">
      <span className="orbit-cab-glow" aria-hidden="true" />

      <div className="orbit-page-head">
        <div>
          <h1 className="orbit-page-title">Кабинет</h1>
          <p className="orbit-page-sub">
            {player.nickname} · P{player.code} · {role}
          </p>
        </div>
        {inviteCount > 0 ? (
          <span className="orbit-cab-chip">
            {inviteCount} {plural(inviteCount, "приглашение", "приглашения", "приглашений")}
          </span>
        ) : null}
      </div>

      <div className="orbit-cab-shell">
        <aside className="orbit-cab-rail orbit-frame">
          <div className="orbit-cab-who">
            <span className="orbit-cab-av" aria-hidden="true">
              {initials(player.nickname)}
            </span>
            <div className="min-w-0">
              <b>{player.nickname}</b>
              <span>P{player.code}</span>
            </div>
          </div>

          <nav className="orbit-cab-nav">
            <a href="#top" data-active="true">
              Кабинет
            </a>
            <a href="#teams">
              Мои команды
              {activeTeams.length > 0 ? <i>{activeTeams.length}</i> : null}
            </a>
            <a href="#applications">
              Заявки
              {applications.length > 0 ? (
                <i data-hot={inviteCount > 0 ? "true" : undefined}>{applications.length}</i>
              ) : null}
            </a>
            <Link href="/me/profile">Профиль</Link>
          </nav>

          <div className="orbit-cab-foot">
            <form action={playerLogoutAction}>
              <button type="submit">Выйти из аккаунта</button>
            </form>
          </div>
        </aside>

        <div className="orbit-cab-content">
          {inviteCount > 0 ? (
            <section className="orbit-cab-card orbit-frame" data-hot="true">
              <div className="orbit-cab-head">
                <h2>Приглашения</h2>
                <span className="orbit-cab-tag" data-hot="true">
                  {inviteCount} · ждут ответа
                </span>
              </div>

              {invitations.map((invite) => (
                <div className="orbit-cab-row" key={invite.id}>
                  <div className="min-w-0">
                    <small>{invite.cupName}</small>
                    <b>{invite.teamName}</b>
                  </div>
                  <div className="orbit-cab-end">
                    <span className="orbit-app-mini" data-accent="true">
                      <CommandForm
                        label="Принять"
                        variant="primary"
                        fields={{ action: "invite_accept", invite_id: invite.id }}
                      />
                    </span>
                    <span className="orbit-app-mini">
                      <CommandForm
                        label="Отклонить"
                        fields={{ action: "invite_decline", invite_id: invite.id }}
                      />
                    </span>
                  </div>
                </div>
              ))}

              {incoming.requests.map((request) => (
                <div className="orbit-cab-row" key={`role-${request.id}`}>
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
                  <div className="orbit-cab-end">
                    <span className="orbit-app-mini" data-accent="true">
                      <CommandForm
                        label="Принять"
                        variant="primary"
                        fields={{ action: "captain_accept", request_id: request.id }}
                      />
                    </span>
                    <span className="orbit-app-mini">
                      <CommandForm
                        label="Отклонить"
                        fields={{ action: "captain_decline", request_id: request.id }}
                      />
                    </span>
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          <section className="orbit-cab-card orbit-frame" id="teams">
            <div className="orbit-cab-head">
              <h2>Мои команды</h2>
              <span className="orbit-cab-tag">{activeTeams.length} · активные</span>
            </div>

            {teams.length ? (
              <div className="orbit-cab-teams">
                {teams.map((team) => (
                  <Link
                    prefetch={false}
                    key={team.id}
                    href={`/me/teams/${team.id}`}
                    className="orbit-cab-team"
                  >
                    <span className="mk" aria-hidden="true">
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
                Создайте свою команду или дождитесь приглашения в состав.
              </p>
            )}
          </section>

          <section className="orbit-cab-card orbit-frame" id="applications">
            <div className="orbit-cab-head">
              <h2>Мои участия</h2>
              <span className="orbit-cab-tag">
                {applications.length}{" "}
                {plural(applications.length, "заявка", "заявки", "заявок")}
              </span>
            </div>

            {applications.length ? (
              applications.map((application) => (
                <div className="orbit-cab-row" key={application.id}>
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
                  </div>
                  <div className="orbit-cab-end">
                    <span
                      className="orbit-app-status"
                      data-tone={statusTone(application.status)}
                      style={{ marginTop: 0 }}
                    >
                      {applicationLabels[application.status]}
                    </span>
                    <span className="orbit-app-mini">
                      <ButtonLink
                        href={`/me/applications/${application.id}`}
                        size="sm"
                        variant="ghost"
                      >
                        Открыть
                      </ButtonLink>
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="orbit-cabinet-empty">
                Вы пока не в турнирном составе. Командную заявку подаёт капитан.
              </p>
            )}
          </section>

          {openCups.length > 0 ? (
            <section className="orbit-cab-card orbit-frame">
              <div className="orbit-cab-head">
                <h2>Следующие кубки</h2>
                <span className="orbit-cab-tag">приём открыт</span>
              </div>
              {openCups.map((cup) => (
                <div className="orbit-cab-row" key={cup.id}>
                  <div className="min-w-0">
                    <small>
                      {cup.game} · {cup.roster_size} + {cup.max_substitutes} запасных
                    </small>
                    <b>{cup.name}</b>
                  </div>
                  <div className="orbit-cab-end">
                    <span className="orbit-app-mini" data-accent="true">
                      <ButtonLink href={`/t/${cup.slug}/register`} size="sm" variant="live">
                        Участие ↗
                      </ButtonLink>
                    </span>
                  </div>
                </div>
              ))}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
