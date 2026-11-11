import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
import { applicationLabels, type CommunityTeam } from "@/lib/types/registration";
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
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Личный кабинет · P{player.code}</p>
          <h1 className="page-title mt-3">{player.nickname}</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/me/profile" variant="secondary" size="sm">
            Мой профиль
          </ButtonLink>
          <form action={playerLogoutAction}>
            <button
              className="min-h-11 rounded-pill border border-edge px-4 text-sm"
              type="submit"
            >
              Выйти из аккаунта
            </button>
          </form>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Команды под управлением",
            count: teams.filter((t) => !t.archived).length,
          },
          { label: "Турнирные заявки", count: applications.length },
          {
            label: "Приглашения и роли",
            count: invitations.length + incoming.requests.length,
          },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-sm text-ink-muted">{s.label}</p>
            <p className="mt-3 text-3xl text-accent">{s.count}</p>
          </Card>
        ))}
      </div>
      <Card className="p-5 sm:p-7">
        <div className="mb-5 flex flex-wrap justify-between gap-3">
          <h2 className="text-2xl">Мои команды</h2>
          <ButtonLink href="/me/teams/new" size="sm">
            Создать команду
          </ButtonLink>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {teams.map((t) => (
            <Link
              prefetch={false}
              key={t.id}
              href={`/me/teams/${t.id}`}
              className="interactive-card rounded-control border border-edge bg-panel p-5"
            >
              <p className="font-medium">
                {t.name}{" "}
                {t.tag ? <span className="text-xs text-accent">[{t.tag}]</span> : null}
              </p>
              <p className="mt-2 text-sm text-ink-muted">
                {t.archived
                  ? "Закрыта"
                  : t.main_captain === player.id
                    ? "Главный капитан"
                    : "Второй капитан"}
              </p>
            </Link>
          ))}
        </div>
        {!teams.length ? (
          <p className="text-sm text-ink-muted">
            Создайте свою команду или дождитесь приглашения в состав. Права капитана
            сами по себе не занимают игровой слот.
          </p>
        ) : null}
      </Card>
      {invitations.length || incoming.requests.length ? (
        <Card className="p-5 sm:p-7">
          <h2 className="mb-5 text-2xl">Входящие приглашения</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {invitations.map((i) => (
              <div
                key={i.id}
                className="rounded-control border border-edge bg-panel p-5"
              >
                <p className="font-medium">{i.teamName}</p>
                <p className="mt-2 text-sm text-ink-muted">{i.cupName}</p>
                <div className="mt-4 flex gap-3">
                  <CommandForm
                    label="Принять"
                    variant="primary"
                    fields={{ action: "invite_accept", invite_id: i.id }}
                  />
                  <CommandForm
                    label="Отклонить"
                    fields={{ action: "invite_decline", invite_id: i.id }}
                  />
                </div>
              </div>
            ))}
            {incoming.requests.map((r) => (
              <div
                key={`role-${r.id}`}
                className="rounded-control border border-edge bg-panel p-5"
              >
                <p className="font-medium">
                  {otherTeams.data?.find((t) => t.id === r.community_team_id)?.name ??
                    "Команда"}
                </p>
                <p className="mt-2 text-sm text-ink-muted">
                  Предлагают роль:{" "}
                  {r.role === "main" ? "главный капитан" : "второй капитан"}
                </p>
                <div className="mt-4 flex gap-3">
                  <CommandForm
                    label="Принять роль"
                    variant="primary"
                    fields={{ action: "captain_accept", request_id: r.id }}
                  />
                  <CommandForm
                    label="Отклонить"
                    fields={{ action: "captain_decline", request_id: r.id }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
      <Card className="p-5 sm:p-7">
        <h2 className="mb-5 text-2xl">Мои участия</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {applications.map((a) => (
            <Link
              prefetch={false}
              key={a.id}
              href={`/me/applications/${a.id}`}
              className="interactive-card rounded-control border border-edge bg-panel p-5"
            >
              <p className="text-xs text-ink-muted">
                {tournaments.find((t) => t.id === a.tournament_id)?.name ?? "Турнир"}
              </p>
              <p className="mt-2 font-medium">
                {(
                  otherTeams.data as
                    | Pick<CommunityTeam, "id" | "name" | "slug">[]
                    | null
                )?.find((t) => t.id === a.community_team_id)?.name ?? "Команда"}
              </p>
              <span className="mt-3 inline-block rounded-pill bg-accent-soft px-3 py-1 text-xs text-accent">
                {applicationLabels[a.status]}
              </span>
              {a.reason ? (
                <p className="mt-3 text-sm text-ink-muted">{a.reason}</p>
              ) : null}
            </Link>
          ))}
        </div>
        {!applications.length ? (
          <p className="text-sm text-ink-muted">
            Вы пока не в турнирном составе. Командную заявку подаёт капитан.
          </p>
        ) : null}
      </Card>
      <Card className="p-5 sm:p-7">
        <h2 className="mb-5 text-2xl">Следующие кубки</h2>
        <div className="flex flex-wrap gap-3">
          {tournaments
            .filter((t) => t.registration_open && t.status !== "finished")
            .map((t) => (
              <ButtonLink key={t.id} href={`/t/${t.slug}/register`} variant="secondary">
                {t.name} · участие ↗
              </ButtonLink>
            ))}
        </div>
      </Card>
    </div>
  );
}
