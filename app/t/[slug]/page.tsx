import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { CardHeader, EmptyState } from "@/components/ui/Card";
import { Container } from "@/components/ui/PageHeader";
import { MatchRow } from "@/components/match/MatchRow";
import {
  getHighlights,
  getTournament,
  getTeams,
  getRosters,
  getStandings,
  getStages,
} from "@/lib/queries/public";
import { Icon, type IconName } from "@/components/ui/Icon";
import { formatDayRange } from "@/lib/format/date";
import Link from "next/link";
import { community } from "@/lib/community";
import { formatDateRange } from "@/lib/format/date";

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
  if (!tournament) return { title: "Турнир не найден" };

  const dates = formatDateRange(
    tournament.starts_at,
    tournament.ends_at,
    tournament.time_zone,
  );

  const description =
    tournament.description ??
    [tournament.format_summary, dates].filter(Boolean).join(" · ") ??
    undefined;

  return {
    title: tournament.name,
    description,
    openGraph: { title: tournament.name, description: description ?? undefined },
  };
}

export default async function TournamentOverviewPage({ params }: Props) {
  const { slug } = await params;
  const tournament = await getTournament(slug);
  if (!tournament) notFound();

  const [{ live, upcoming, recent }, teams, { players }, standings, stages] =
    await Promise.all([
      getHighlights(slug),
      getTeams(slug),
      getRosters(slug),
      getStandings(slug),
      getStages(slug),
    ]);
  const groupIds = [...new Set(standings.map((row) => row.group_id))];
  const dates = formatDateRange(
    tournament.starts_at,
    tournament.ends_at,
    tournament.time_zone,
  );

  return (
    <Container className="orbit-overview">
      <h1 className="sr-only">{tournament.name}</h1>
      <dl className="orbit-facts orbit-frame">
        {[
          { label: "Даты", value: dates, icon: "calendar" },
          { label: "Дисциплина", value: tournament.game, icon: "game" },
          { label: "Сезон", value: tournament.edition, icon: "trophy" },
        ].map((item) => (
          <div key={item.label}>
            <Icon name={item.icon as IconName} />
            <div>
              <dt>{item.label}</dt>
              <dd>{item.value ?? "Уточняется"}</dd>
            </div>
          </div>
        ))}
      </dl>
      {live.length ? (
        <section className="orbit-live-section">
          <CardHeader
            title="Идёт сейчас"
            icon="play"
            hint="Счёт обновляется автоматически"
          />
          {live.map((match) => (
            <MatchRow
              key={match.id}
              match={match}
              timeZone={tournament.time_zone}
              href={`/t/${slug}/matches/${match.id}`}
            />
          ))}
        </section>
      ) : null}
      <div className="orbit-overview-main">
        <section>
          <div className="orbit-section-heading">
            <h2 className="orbit-section-title">Ближайшие матчи</h2>
            <ButtonLink href={`/t/${slug}/schedule`} variant="ghost" size="sm">
              Всё расписание ↗
            </ButtonLink>
          </div>
          <div className="orbit-match-panel orbit-frame">
            {upcoming.length ? (
              upcoming
                .slice(0, 3)
                .map((match) => (
                  <MatchRow
                    key={match.id}
                    match={match}
                    timeZone={tournament.time_zone}
                    href={`/t/${slug}/matches/${match.id}`}
                  />
                ))
            ) : (
              <EmptyState
                icon="calendar"
                title="Расписание появится после жеребьёвки"
                hint="Матчи и время начала будут здесь."
              />
            )}
          </div>
          {recent.length ? (
            <details className="orbit-extra-results">
              <summary>
                Последние результаты <span aria-hidden="true">↗</span>
              </summary>
              <div>
                {recent.slice(0, 3).map((match) => (
                  <MatchRow
                    key={match.id}
                    match={match}
                    timeZone={tournament.time_zone}
                    href={`/t/${slug}/matches/${match.id}`}
                  />
                ))}
              </div>
              <ButtonLink href={`/t/${slug}/results`} variant="ghost" size="sm">
                Все итоги ↗
              </ButtonLink>
            </details>
          ) : null}
        </section>
        <aside className="orbit-about orbit-frame">
          <h2 className="orbit-section-title">О турнире</h2>
          <dl>
            <div>
              <dt>Игра</dt>
              <dd>{tournament.game}</dd>
            </div>
            <div>
              <dt>Даты</dt>
              <dd>{dates ?? "Уточняются"}</dd>
            </div>
            <div>
              <dt>Призовой фонд</dt>
              <dd>{tournament.prize_pool ?? "Уточняется"}</dd>
            </div>
          </dl>
          {tournament.format_summary ? (
            <details className="orbit-format-details">
              <summary>Формат и этапы</summary>
              <p>{tournament.format_summary}</p>
              {stages.length ? (
                <ol>
                  {stages.map((stage) => (
                    <li key={stage.id}>
                      <strong>{stage.name}</strong>
                      <span>
                        BO{stage.best_of} ·{" "}
                        {formatDayRange(stage.starts_on, stage.ends_on) ??
                          "Даты уточняются"}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </details>
          ) : null}
          {tournament.description ? (
            <details className="orbit-format-details">
              <summary>Описание турнира</summary>
              <p>{tournament.description}</p>
            </details>
          ) : null}
          <div className="orbit-about-actions">
            {tournament.registration_open ? (
              <ButtonLink href={`/t/${slug}/register`} variant="secondary">
                Участие в турнире ↗
              </ButtonLink>
            ) : null}
            {tournament.stream_url ? (
              <ButtonLink href={tournament.stream_url} variant="ghost" external>
                Эфир турнира ↗
              </ButtonLink>
            ) : null}
          </div>
        </aside>
      </div>
      <section className="orbit-path-section">
        <div className="orbit-section-heading">
          <h2 className="orbit-section-title">Путь к кубку</h2>
        </div>
        <nav className="orbit-phase-rail" aria-label="Этапы и итоги">
          {(
            [
              { label: "Группы", path: "groups", icon: "users" },
              { label: "Плей-офф", path: "bracket", icon: "bracket" },
              { label: "Итоги", path: "results", icon: "trophy" },
            ] as const
          ).map((item) => (
            <Link
              href={`/t/${slug}/${item.path}`}
              key={item.path}
              className="orbit-phase orbit-frame"
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </section>
      <section className="orbit-teams-section">
        <div className="orbit-section-heading">
          <h2 className="orbit-section-title">Команды на орбите</h2>
          <ButtonLink href={`/t/${slug}/teams`} variant="ghost" size="sm">
            Все команды ↗
          </ButtonLink>
        </div>
        {teams.length ? (
          <div className="orbit-overview-teams">
            {teams.slice(0, 8).map((team) => (
              <Link
                key={team.id}
                href={`/t/${slug}/teams/${team.slug}`}
                className="orbit-team-compact orbit-frame"
              >
                <span aria-hidden="true">
                  {team.tag || team.name.replace(/^Team\s+/i, "").slice(0, 2)}
                </span>
                <strong>{team.name}</strong>
              </Link>
            ))}
          </div>
        ) : (
          <div className="orbit-team-pending orbit-frame">
            <div className="orbit-pending-marks" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((n) => (
                <span key={n}>
                  <Icon name="spark" />
                </span>
              ))}
            </div>
            <p>Составы появятся после подтверждения заявок</p>
          </div>
        )}
        {groupIds.length ? (
          <details className="orbit-extra-results">
            <summary>
              Положение команд <span aria-hidden="true">↗</span>
            </summary>
            <div className="orbit-standings-summary">
              {groupIds.map((id) => (
                <section key={id}>
                  <h3>{standings.find((row) => row.group_id === id)?.group_name}</h3>
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Команда</th>
                        <th scope="col">Игры</th>
                        <th scope="col">Очки</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings
                        .filter((row) => row.group_id === id)
                        .slice(0, 4)
                        .map((row) => (
                          <tr key={row.team_id}>
                            <td>
                              <Link href={`/t/${slug}/teams/${row.team_slug}`}>
                                {row.team_name}
                              </Link>
                            </td>
                            <td>{row.played}</td>
                            <td>{row.points}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </section>
              ))}
            </div>
            <ButtonLink href={`/t/${slug}/groups`} variant="ghost" size="sm">
              Все группы ↗
            </ButtonLink>
          </details>
        ) : null}
      </section>
      <section className="orbit-community-band orbit-frame">
        <h2 className="orbit-section-title">
          Свои люди. <span className="text-accent">Одна орбита.</span>
        </h2>
        <div>
          {tournament.telegram_url || community.telegram ? (
            <ButtonLink
              href={tournament.telegram_url || community.telegram}
              variant="secondary"
              external
            >
              <Icon name="telegram" />
              Telegram ↗
            </ButtonLink>
          ) : null}
          {tournament.stream_url || community.stream ? (
            <ButtonLink
              href={tournament.stream_url || community.stream}
              variant="secondary"
              external
            >
              <Icon name="play" />
              Канал трансляций ↗
            </ButtonLink>
          ) : null}
        </div>
      </section>
      <p className="orbit-roster-count">
        {teams.length} команд · {players.length} игроков
      </p>
    </Container>
  );
}
