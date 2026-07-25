import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, TournamentStatusBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { Container } from "@/components/ui/PageHeader";
import { MatchRow } from "@/components/match/MatchRow";
import { getHighlights, getTournament } from "@/lib/queries/public";
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

  const { live, upcoming, recent } = await getHighlights(slug);
  const dates = formatDateRange(
    tournament.starts_at,
    tournament.ends_at,
    tournament.time_zone,
  );

  return (
    <Container className="py-8 sm:py-12">
      <section className="rounded-card border border-edge bg-gradient-to-br from-accent-soft via-panel to-info-soft p-6 sm:p-10">
        <div className="flex flex-wrap items-center gap-3">
          <TournamentStatusBadge status={tournament.status} />
          {tournament.edition ? (
            <Badge tone="neutral">сезон {tournament.edition}</Badge>
          ) : null}
          <Badge tone="neutral">{tournament.game}</Badge>
        </div>

        <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">
          {tournament.name}
        </h1>

        {tournament.description ? (
          <p className="mt-4 max-w-2xl text-ink-muted">{tournament.description}</p>
        ) : null}

        <dl className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-control border border-edge bg-surface-sunken/60 p-4">
            <dt className="text-xs uppercase tracking-wide text-ink-faint">Даты</dt>
            <dd className="mt-1 font-semibold">{dates ?? "уточняются"}</dd>
          </div>
          <div className="rounded-control border border-edge bg-surface-sunken/60 p-4">
            <dt className="text-xs uppercase tracking-wide text-ink-faint">Формат</dt>
            <dd className="mt-1 font-semibold">{tournament.format_summary ?? "—"}</dd>
          </div>
          <div className="rounded-control border border-edge bg-surface-sunken/60 p-4">
            <dt className="text-xs uppercase tracking-wide text-ink-faint">
              Призовой фонд
            </dt>
            <dd className="mt-1 font-semibold">{tournament.prize_pool ?? "—"}</dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-wrap gap-2">
          <ButtonLink href={`/t/${slug}/schedule`}>Расписание</ButtonLink>
          <ButtonLink href={`/t/${slug}/groups`} variant="secondary">
            Группы
          </ButtonLink>
          <ButtonLink href={`/t/${slug}/bracket`} variant="secondary">
            Плей-офф
          </ButtonLink>
          {tournament.stream_url ? (
            <ButtonLink href={tournament.stream_url} variant="live" external>
              Смотреть стрим
            </ButtonLink>
          ) : null}
        </div>
      </section>

      {live.length > 0 ? (
        <Card className="mt-8 border-live/40">
          <CardHeader
            title="Идёт сейчас"
            hint="Счёт обновляется автоматически, перезагружать страницу не нужно"
          />
          <div className="grid gap-3 p-5 sm:grid-cols-2">
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

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Ближайшие матчи"
            action={
              <ButtonLink href={`/t/${slug}/schedule`} variant="ghost" size="sm">
                Всё расписание
              </ButtonLink>
            }
          />
          <div className="space-y-3 p-5">
            {upcoming.length > 0 ? (
              upcoming.map((match) => (
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
            action={
              <ButtonLink href={`/t/${slug}/results`} variant="ghost" size="sm">
                Итоги
              </ButtonLink>
            }
          />
          <div className="space-y-3 p-5">
            {recent.length > 0 ? (
              recent.map((match) => (
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
    </Container>
  );
}
