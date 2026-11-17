import { AccountPageBoundary } from "@/components/player/AccountPageBoundary";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/PageHeader";
import { TeamEmblem } from "@/components/team/TeamEmblem";
import { getPublicCommunityTeam } from "@/lib/queries/public";

function initials(value: string): string {
  return value
    .replace(/^Team\s+/i, "")
    .slice(0, 2)
    .toUpperCase();
}

function plural(count: number, one: string, few: string, many: string): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

type Captain = { nickname: string } | null;

function CaptainCard({ role, captain }: { role: string; captain: Captain }) {
  if (!captain) {
    return (
      <div className="orbit-ct-cap orbit-frame" data-empty="true">
        <span className="mark" aria-hidden="true">
          —
        </span>
        <div>
          <p className="role">{role}</p>
          <b>Не назначен</b>
        </div>
      </div>
    );
  }

  return (
    <div className="orbit-ct-cap orbit-frame">
      <span className="mark" aria-hidden="true">
        {initials(captain.nickname)}
      </span>
      <div>
        <p className="role">{role}</p>
        <b>{captain.nickname}</b>
      </div>
    </div>
  );
}

type PublicCommunityTeamPageProps = {
  params: Promise<{ slug: string }>;
};

export default function PublicCommunityTeamPage(props: PublicCommunityTeamPageProps) {
  return (
    <AccountPageBoundary>
      <PublicCommunityTeamPageContent {...props} />
    </AccountPageBoundary>
  );
}

async function PublicCommunityTeamPageContent({
  params,
}: PublicCommunityTeamPageProps) {
  const team = await getPublicCommunityTeam((await params).slug);
  if (!team) notFound();

  const sub = [
    "команда сообщества",
    team.tag ?? null,
    `${team.participations.length} ${plural(
      team.participations.length,
      "турнир",
      "турнира",
      "турниров",
    )}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Container className="orbit-team-page">
      <div className="orbit-ct">
        <div className="orbit-page-head">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-accent" aria-hidden="true">
                <TeamEmblem slug={team.slug} size={40} />
              </span>
              <h1 className="orbit-page-title">{team.name}</h1>
            </div>
            <p className="orbit-page-sub">{sub}</p>
          </div>
          <div className="orbit-team-chips">
            {team.tag ? <span className="orbit-groups-window">{team.tag}</span> : null}
            {team.archived ? (
              <span className="orbit-groups-window">закрыта</span>
            ) : null}
          </div>
        </div>

        {team.description ? (
          <p className="orbit-register-note" style={{ marginTop: 18 }}>
            {team.description}
          </p>
        ) : null}

        <div className="orbit-ct-caps">
          <CaptainCard role="Главный капитан" captain={team.main_captain} />
          <CaptainCard role="Второй капитан" captain={team.second_captain} />
        </div>

        <section className="orbit-ct-history orbit-frame">
          <div className="orbit-ct-hist-head">
            <h2>Участники</h2>
            <span>{team.members.length}</span>
          </div>
          {team.members.length ? (
            team.members.map((member, index) => (
              <div className="orbit-tm-row" key={index}>
                <b>{member.nickname}</b>
                <span className="text-sm text-ink-muted">Участник</span>
              </div>
            ))
          ) : (
            <p className="orbit-app-note">Капитаны пока не добавили участников.</p>
          )}
        </section>

        <section className="orbit-ct-history orbit-frame">
          <div className="orbit-ct-hist-head">
            <h2>История участия</h2>
            <span>
              {team.participations.length}{" "}
              {plural(team.participations.length, "турнир", "турнира", "турниров")}
            </span>
          </div>

          {team.participations.length ? (
            team.participations.map((participation) => (
              <Link
                key={`${participation.slug}-${participation.team_slug}`}
                href={`/t/${participation.slug}/teams/${participation.team_slug}`}
                className="orbit-ct-row"
              >
                <div className="min-w-0">
                  <b>{participation.name}</b>
                  <small>команда на турнире</small>
                </div>
                <span className="go" aria-hidden="true">
                  ↗
                </span>
              </Link>
            ))
          ) : (
            <p className="orbit-ct-empty">Принятых турнирных заявок пока нет.</p>
          )}
        </section>
      </div>
    </Container>
  );
}
