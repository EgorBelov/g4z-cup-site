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
  // нули в шапке только шумят: показываем то, что у игрока реально есть
  const counters = [
    {
      value: activeTeams.length,
      label: plural(activeTeams.length, "команда", "команды", "команд"),
    },
    {
      value: applications.length,
      label: plural(applications.length, "заявка", "заявки", "заявок"),
    },
    {
      value: inviteCount,
      label: plural(inviteCount, "приглашение", "приглашения", "приглашений"),
    },
  ].filter((counter) => counter.value > 0);

  const teamName = (id: number) =>
    (otherTeams.data as Pick<CommunityTeam, "id" | "name" | "slug">[] | null)?.find(
      (t) => t.id === id,
    )?.name ?? "Команда";

  return (
    <div className="orbit-sh">
      <section className="orbit-sh-hero orbit-frame">
        <div className="min-w-0">
          <p className="orbit-sh-label">Кабинет</p>
          <h1>{player.nickname}</h1>
          <p className="orbit-sh-meta">
            <span>P{player.code}</span>
            {counters.map((counter) => (
              <span key={counter.label}>
                <b>{counter.value}</b> {counter.label}
              </span>
            ))}
          </p>
        </div>
        <div className="orbit-sh-actions">
          <ButtonLink href="/me/profile" size="sm" variant="secondary">
            Профиль
          </ButtonLink>
          <span className="orbit-sh-out">
            <form action={playerLogoutAction}>
              <button type="submit">Выйти</button>
            </form>
          </span>
        </div>
      </section>

      <div className="orbit-sh-grid">
        {inviteCount > 0 ? (
          <section className="orbit-sh-card orbit-frame">
            <div className="orbit-sh-head">
              <div>
                <h2>Приглашения</h2>
                <small>ждут ответа</small>
              </div>
              <span className="orbit-sh-count" data-hot="true">
                {inviteCount}
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
                      label="✕"
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
                  <b>{teamName(request.community_team_id)}</b>
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
                      label="✕"
                      fields={{ action: "captain_decline", request_id: request.id }}
                    />
                  </span>
                </div>
              </div>
            ))}
          </section>
        ) : null}

        <section className="orbit-sh-card orbit-frame">
          <div className="orbit-sh-head">
            <div>
              <h2>Мои команды</h2>
              <small>активные</small>
            </div>
            <span className="orbit-sh-count">{activeTeams.length}</span>
          </div>

          {teams.length ? (
            teams.map((team) => (
              <div className="orbit-cab-row" key={team.id}>
                <div className="min-w-0" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span className="orbit-cab-av" style={{ width: 34, height: 34, fontSize: 10 }}>
                    {teamMark(team.name, team.tag)}
                  </span>
                  <div className="min-w-0">
                    <b>{team.name}</b>
                    <small>
                      {team.archived
                        ? "закрыта"
                        : team.main_captain === player.id
                          ? "главный капитан"
                          : "второй капитан"}
                    </small>
                  </div>
                </div>
                <div className="orbit-cab-end">
                  <span className="orbit-app-mini">
                    <ButtonLink href={`/me/teams/${team.id}`} size="sm" variant="ghost">
                      Открыть
                    </ButtonLink>
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="orbit-sh-note">
              Создайте свою команду или дождитесь приглашения в состав.
            </p>
          )}

          <p className="orbit-sh-note">
            <Link href="/me/teams/new">Создать новую команду ↗</Link>
          </p>
        </section>

        <section className="orbit-sh-card orbit-frame">
          <div className="orbit-sh-head">
            <div>
              <h2>Мои участия</h2>
              <small>заявки на турниры</small>
            </div>
            <span className="orbit-sh-count">{applications.length}</span>
          </div>

          {applications.length ? (
            applications.map((application) => (
              <div className="orbit-cab-row" key={application.id}>
                <div className="min-w-0">
                  <small>
                    {tournaments.find((t) => t.id === application.tournament_id)?.name ??
                      "Турнир"}
                  </small>
                  <b>{teamName(application.community_team_id)}</b>
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
            <p className="orbit-sh-note">
              Вы пока не в турнирном составе. Командную заявку подаёт капитан.
            </p>
          )}
        </section>

        <section className="orbit-sh-card orbit-frame">
          <div className="orbit-sh-head">
            <div>
              <h2>Следующие кубки</h2>
              <small>приём открыт</small>
            </div>
            <span className="orbit-sh-count">{openCups.length}</span>
          </div>

          {openCups.length ? (
            openCups.map((cup) => (
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
            ))
          ) : (
            <p className="orbit-sh-note">
              Открытых турниров сейчас нет. Следите за анонсами в Telegram.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
