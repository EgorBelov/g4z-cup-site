import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, TournamentStatusBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
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
import { BrandMark } from "@/components/brand/BrandMark";
import { formatDayRange } from "@/lib/format/date";
import Link from "next/link";
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
    <Container className="py-8 sm:py-12">
      <section className="grid items-center gap-8 pb-12 pt-4 lg:grid-cols-2 lg:gap-16 lg:pb-16">
        <div>
          <span className="game-chip text-accent">
            <Icon name="game" className="size-4" />
            {tournament.game}
          </span>
          <h1 className="page-title mb-7 text-6xl sm:text-8xl">{tournament.name}</h1>
          <p className="text-lg leading-relaxed">
            Свои люди.
            <br />
            На одной орбите.
          </p>
          {tournament.description ? (
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-muted">
              {tournament.description}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <TournamentStatusBadge status={tournament.status} />
            {tournament.edition ? <Badge>Сезон {tournament.edition}</Badge> : null}
            <span className="inline-flex items-center gap-2 text-xs text-ink-muted">
              <Icon name="users" className="size-4 text-accent" />
              {teams.length} команд / {players.length} игроков
            </span>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href={`/t/${slug}/schedule`}>Расписание ↗</ButtonLink>
            {tournament.stream_url ? (
              <ButtonLink href={tournament.stream_url} variant="secondary" external>
                Смотреть эфир ↗
              </ButtonLink>
            ) : null}
          </div>
        </div>
        <div className="orbit-stage relative isolate overflow-hidden rounded-card border border-edge bg-panel p-5">
          <BrandMark animated className="mx-auto w-full max-w-[400px]" />
        </div>
      </section>
      <dl className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Даты турнира",
            value: dates,
            icon: "calendar",
            tone: "bg-accent-soft text-accent",
          },
          {
            label: "Формат",
            value: tournament.format_summary,
            icon: "bracket",
            tone: "bg-violet-soft text-violet",
          },
          {
            label: "Призовой фонд",
            value: tournament.prize_pool,
            icon: "trophy",
            tone: "bg-ember-soft text-ember",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex gap-4 rounded-card border border-edge bg-panel p-5"
          >
            <span
              className={`grid size-11 shrink-0 place-items-center rounded-control ${stat.tone}`}
            >
              <Icon name={stat.icon as IconName} />
            </span>
            <div className="min-w-0">
              <dt className="eyebrow">{stat.label}</dt>
              <dd className="mt-2 break-words text-base">
                {stat.value ?? "Уточняется"}
              </dd>
            </div>
          </div>
        ))}
      </dl>

      <nav
        aria-label="Разделы турнира"
        className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {(
          [
            { path: "schedule", label: "Расписание", icon: "calendar" },
            { path: "bracket", label: "Плей-офф", icon: "bracket" },
            { path: "teams", label: "Команды", icon: "users" },
            { path: "results", label: "Итоги", icon: "trophy" },
          ] as const
        ).map((item) => (
          <Link
            key={item.path}
            href={`/t/${slug}/${item.path}`}
            className="interactive-card flex items-center gap-3 rounded-control border border-edge bg-panel px-4 py-4 text-sm"
          >
            <Icon name={item.icon} className="text-accent" />
            <span className="flex-1">{item.label}</span>
            <Icon name="arrow" className="size-3.5 text-ink-faint" />
          </Link>
        ))}
      </nav>
      {live.length > 0 ? (
        <Card className="mt-8 border-live/40">
          <CardHeader
            title="Идёт сейчас"
            icon="play"
            hint="Счёт обновляется автоматически, перезагружать страницу не нужно"
          />
          <div className="px-5 pb-5">
            {live.map((match) => (
              <MatchRow
                key={match.id}
                match={match}
                timeZone={tournament.time_zone}
                href={`/t/${slug}/matches/${match.id}`}
              />
            ))}
          </div>
        </Card>
      ) : null}

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Ближайшие матчи"
            icon="calendar"
            action={
              <ButtonLink href={`/t/${slug}/schedule`} variant="ghost" size="sm">
                Всё расписание
              </ButtonLink>
            }
          />
          <div className="px-5 pb-5">
            {upcoming.length > 0 ? (
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
              <EmptyState title="Матчи ещё не назначены" />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Последние результаты"
            icon="chart"
            action={
              <ButtonLink href={`/t/${slug}/results`} variant="ghost" size="sm">
                Итоги
              </ButtonLink>
            }
          />
          <div className="px-5 pb-5">
            {recent.length > 0 ? (
              recent
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
              <EmptyState title="Ещё ни один матч не завершён" />
            )}
          </div>
        </Card>
      </div>
      <div className="mt-6 grid items-start gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Положение команд"
            icon="users"
            action={
              <ButtonLink href={`/t/${slug}/groups`} size="sm" variant="ghost">
                Все группы ↗
              </ButtonLink>
            }
          />
          <div className="space-y-7 px-5 pb-5">
            {groupIds.length ? (
              groupIds.map((id) => (
                <section key={id}>
                  <h3 className="eyebrow mb-3">
                    {standings.find((row) => row.group_id === id)?.group_name}
                  </h3>
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-ink-faint">
                      <tr>
                        <th scope="col" className="py-3 font-normal">
                          Команда
                        </th>
                        <th scope="col" className="py-3 text-right font-normal">
                          Игры
                        </th>
                        <th scope="col" className="py-3 text-right font-normal">
                          Очки
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings
                        .filter((row) => row.group_id === id)
                        .slice(0, 4)
                        .map((row) => (
                          <tr key={row.team_id} className="border-t border-edge">
                            <td className="py-4 pr-3">
                              <Link
                                href={`/t/${slug}/teams/${row.team_slug}`}
                                className="break-words hover:text-accent"
                              >
                                {row.team_name}
                              </Link>
                            </td>
                            <td className="text-right tabular-nums text-ink-faint">
                              {row.played}
                            </td>
                            <td className="text-right tabular-nums text-accent">
                              {row.points}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </section>
              ))
            ) : (
              <EmptyState title="Таблицы появятся после распределения по группам" />
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Путь к кубку" icon="trophy" />
          <ol className="space-y-3 px-5 pb-5">
            {stages.length ? (
              stages.map((stage, index) => (
                <li
                  key={stage.id}
                  className="flex gap-4 rounded-control border border-edge bg-surface p-4"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-control bg-accent-soft font-mono text-sm text-accent">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-lg">{stage.name}</h3>
                    <p className="mt-2 text-xs text-ink-faint">
                      BO{stage.best_of} /{" "}
                      {formatDayRange(stage.starts_on, stage.ends_on) ??
                        "Даты уточняются"}
                    </p>
                  </div>
                </li>
              ))
            ) : (
              <li>
                <EmptyState title="Этапы ещё не объявлены" />
              </li>
            )}
          </ol>
        </Card>
      </div>
      {tournament.telegram_url ? (
        <section className="mt-8 flex flex-wrap items-center justify-between gap-6 rounded-card border border-accent/20 bg-accent-soft p-6 sm:p-8">
          <div>
            <p className="eyebrow mb-3">Игра продолжается за пределами сервера</p>
            <h2 className="section-title">Оставайся на связи.</h2>
          </div>
          <ButtonLink href={tournament.telegram_url} variant="secondary" external>
            Наш Telegram ↗
          </ButtonLink>
        </section>
      ) : null}
    </Container>
  );
}
