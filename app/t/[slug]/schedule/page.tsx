import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { Container, PageHeader, Skeleton } from "@/components/ui/PageHeader";
import { MatchRow } from "@/components/match/MatchRow";
import { getSchedule, getTournament } from "@/lib/queries/public";
import { dayKey, formatDayLabel } from "@/lib/format/date";
import type { MatchDetails } from "@/lib/types/database";

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
    title: tournament ? `Расписание — ${tournament.name}` : "Расписание",
    description: "Полное расписание матчей турнира по дням, со счётом и статусами.",
  };
}

function groupByDay(
  matches: MatchDetails[],
  timeZone: string,
): { key: string; label: string; matches: MatchDetails[] }[] {
  const buckets = new Map<string, MatchDetails[]>();

  for (const match of matches) {
    const key = match.scheduled_at ? dayKey(match.scheduled_at, timeZone) : "tbd";
    buckets.set(key, [...(buckets.get(key) ?? []), match]);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => {
      if (a === "tbd") return 1;
      if (b === "tbd") return -1;
      return a.localeCompare(b);
    })
    .map(([key, items]) => ({
      key,
      label:
        key === "tbd"
          ? "Время уточняется"
          : formatDayLabel(items[0]?.scheduled_at ?? null, timeZone),
      matches: items,
    }));
}

export default function SchedulePage({ params }: Props) {
  return (
    <Container className="py-8 sm:py-12">
      <Suspense fallback={<Skeleton className="h-96" />}>
        {params.then(({ slug }) => (
          <ScheduleView slug={slug} />
        ))}
      </Suspense>
    </Container>
  );
}

async function ScheduleView({ slug }: { slug: string }) {
  "use cache";

  const tournament = await getTournament(slug);
  if (!tournament) notFound();

  const matches = await getSchedule(slug);
  const days = groupByDay(matches, tournament.time_zone);

  return (
    <>
      <PageHeader
        eyebrow={tournament.name}
        title="Расписание"
        description={`Все матчи турнира. Время указано в ${tournament.time_zone}.`}
      />

      {days.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Матчей пока нет"
            hint="Расписание появится, как только организаторы сгенерируют этапы."
          />
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {days.map((day) => (
            <Card key={day.key}>
              <CardHeader
                title={<span className="capitalize">{day.label}</span>}
                hint={`Матчей: ${day.matches.length}`}
              />
              <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
                {day.matches.map((match) => (
                  <MatchRow
                    key={match.id}
                    match={match}
                    timeZone={tournament.time_zone}
                    href={`/t/${slug}/matches/${match.id}`}
                  />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
