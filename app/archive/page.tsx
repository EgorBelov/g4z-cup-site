import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TournamentStatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Container, PageHeader, Skeleton } from "@/components/ui/PageHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { listTournaments } from "@/lib/queries/public";
import { formatDateRange } from "@/lib/format/date";

export const metadata: Metadata = {
  title: "Архив турниров",
  description:
    "Все сезоны G4Z CUP: победители, составы, сетки и полное расписание каждого турнира.",
};

export default function ArchivePage() {
  return (
    <main className="flex min-h-screen flex-col">
      <Container className="flex-1 py-10 sm:py-14">
        <PageHeader
          eyebrow="История"
          title="Архив турниров"
          description="Каждый сезон остаётся доступным навсегда: расписание, сетка, составы и итоги."
        />

        <Suspense fallback={<Skeleton className="mt-10 h-64" />}>
          <ArchiveList />
        </Suspense>
      </Container>
      <SiteFooter />
    </main>
  );
}

async function ArchiveList() {
  const tournaments = await listTournaments();

  if (tournaments.length === 0) {
    return <p className="mt-10 text-ink-muted">Турниров пока нет.</p>;
  }

  return (
    <ul className="mt-10 grid gap-4 md:grid-cols-2">
      {tournaments.map((tournament) => (
        <Card as="li" key={tournament.id} className="transition hover:border-accent/40">
          <Link href={`/t/${tournament.slug}`} className="block p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold tracking-tight">
                  {tournament.name}
                </h2>
                <p className="mt-1 text-sm text-ink-faint">
                  {formatDateRange(
                    tournament.starts_at,
                    tournament.ends_at,
                    tournament.time_zone,
                  ) ?? "Даты уточняются"}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <TournamentStatusBadge status={tournament.status} />
                {tournament.is_current ? (
                  <span className="text-xs text-accent">текущий</span>
                ) : null}
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
              <div>
                <dt className="text-ink-faint">Команд</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">
                  {tournament.team_count}
                </dd>
              </div>
              <div>
                <dt className="text-ink-faint">Матчей</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">
                  {tournament.match_count}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-ink-faint">Чемпион</dt>
                <dd className="mt-0.5 truncate font-semibold">
                  {tournament.champion_name ?? "—"}
                </dd>
              </div>
            </dl>
          </Link>
        </Card>
      ))}
    </ul>
  );
}
