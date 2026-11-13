import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, Skeleton } from "@/components/ui/PageHeader";
import {
  ScheduleBoard,
  type ScheduleDayView,
  type ScheduleRowView,
} from "@/components/schedule/ScheduleBoard";
import { getSchedule, getTournament } from "@/lib/queries/public";
import { dayKey, formatDayLabel, formatTime } from "@/lib/format/date";
import { community } from "@/lib/community";
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

function mark(name: string | null, tag: string | null): string {
  if (tag) return tag.slice(0, 3).toUpperCase();
  if (name) {
    return name
      .replace(/^Team\s+/i, "")
      .slice(0, 2)
      .toUpperCase();
  }
  return "?";
}

function toRow(match: MatchDetails, timeZone: string, slug: string): ScheduleRowView {
  const stage = match.group_name ?? match.round_label ?? match.stage_name;

  return {
    id: match.id,
    href: `/t/${slug}/matches/${match.id}`,
    time: formatTime(match.scheduled_at, timeZone),
    team1: match.team1_name ?? match.team1_source ?? "TBD",
    team2: match.team2_name ?? match.team2_source ?? "TBD",
    mark1: mark(match.team1_name, match.team1_tag),
    mark2: mark(match.team2_name, match.team2_tag),
    score1: match.score1,
    score2: match.score2,
    played: match.status === "live" || match.status === "finished",
    status: match.status,
    meta: [`BO${match.best_of}`, stage].filter(Boolean).join(" · "),
  };
}

function groupByDay(
  matches: MatchDetails[],
  timeZone: string,
  slug: string,
): ScheduleDayView[] {
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
          : formatDayLabel(items[0]?.scheduled_at ?? null, timeZone).replace(
              ", ",
              " · ",
            ),
      matches: items.map((match) => toRow(match, timeZone, slug)),
    }));
}

export default function SchedulePage({ params }: Props) {
  return (
    <Container className="orbit-schedule">
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
  const days = groupByDay(matches, tournament.time_zone, slug);

  return (
    <ScheduleBoard
      days={days}
      timeZone={tournament.time_zone}
      empty={{
        registrationOpen: tournament.registration_open,
        registerHref: `/t/${slug}/register`,
        telegram: tournament.telegram_url || community.telegram || null,
      }}
    />
  );
}
