import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/PageHeader";
import { Icon } from "@/components/ui/Icon";
import { community } from "@/lib/community";
import { getRosters, getTeams, getTournament } from "@/lib/queries/public";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return metadataFor(slug);
}

// `params` is runtime data, so it is resolved above and only the plain
// values are passed into this cached scope.
async function metadataFor(slug: string): Promise<Metadata> {
  "use cache";
  const tournament = await getTournament(slug);

  return {
    title: tournament ? `Команды — ${tournament.name}` : "Команды",
    description: "Участники турнира и их составы.",
  };
}

function plural(count: number, one: string, few: string, many: string): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

function teamMark(name: string, tag: string | null): string {
  if (tag) return tag.slice(0, 3).toUpperCase();
  return name
    .replace(/^Team\s+/i, "")
    .slice(0, 2)
    .toUpperCase();
}

export default async function TeamsPage({ params }: Props) {
  const { slug } = await params;
  const tournament = await getTournament(slug);
  if (!tournament) notFound();

  const [teams, { players, groups }] = await Promise.all([
    getTeams(slug),
    getRosters(slug),
  ]);

  const groupName = new Map(groups.map((group) => [group.id, group.name]));

  return (
    <Container className="orbit-teams">
      <div className="orbit-page-head">
        <div>
          <h1 className="orbit-page-title">Команды</h1>
          <p className="orbit-page-sub">
            {teams.length} {plural(teams.length, "команда", "команды", "команд")} ·{" "}
            {players.length} {plural(players.length, "игрок", "игрока", "игроков")}
          </p>
        </div>
      </div>

      {teams.length === 0 ? (
        <div className="orbit-page-empty orbit-frame">
          <Icon name="users" />
          <h2>Составы появятся после подтверждения заявок</h2>
          <p>
            Сейчас открыт приём заявок. Количество команд не ограничено: сетка и группы
            соберутся под фактический список участников.
          </p>
          {tournament.registration_open || community.telegram ? (
            <div>
              {tournament.registration_open ? (
                <ButtonLink href={`/t/${slug}/register`} variant="live">
                  Подать заявку ↗
                </ButtonLink>
              ) : null}
              {community.telegram ? (
                <ButtonLink href={community.telegram} variant="secondary" external>
                  Следить в Telegram
                </ButtonLink>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="orbit-teams-grid">
          {teams.map((team) => {
            const roster = players.filter((player) => player.team_id === team.id);
            const captain = roster.find((player) => player.is_captain);

            return (
              <Link
                key={team.id}
                href={`/t/${slug}/teams/${team.slug}`}
                className="orbit-team-card orbit-frame"
              >
                <span className="orbit-team-mark" aria-hidden="true">
                  {teamMark(team.name, team.tag)}
                </span>
                <h2>{team.name}</h2>
                <p className="orbit-team-meta">
                  {roster.length} {plural(roster.length, "игрок", "игрока", "игроков")}
                  {captain ? ` · капитан ${captain.nickname}` : ""}
                </p>
                <div className="orbit-team-foot">
                  <span>
                    {team.group_id ? (groupName.get(team.group_id) ?? "Состав") : "Состав"}
                  </span>
                  <span aria-hidden="true">↗</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Container>
  );
}
