import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, PageHeader, Skeleton } from "@/components/ui/PageHeader";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { TournamentExplorer } from "@/components/layout/TournamentExplorer";
import { EmptyState } from "@/components/ui/Card";
import { listTournaments } from "@/lib/queries/public";

export const metadata: Metadata = {
  title: "Архив турниров",
  description:
    "Все сезоны G4Z CUP: победители, составы, сетки и полное расписание каждого турнира.",
};
export default function ArchivePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <Container className="py-10 sm:py-14">
          <PageHeader
            eyebrow="Наша история"
            title="Архив. Всё помним."
            description="Каждый сезон остаётся здесь: расписание, сетка, составы и итоги. Можно вернуться к любому матчу."
          />
          <Suspense fallback={<Skeleton className="mt-12 h-64" />}>
            <ArchiveList />
          </Suspense>
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}
async function ArchiveList() {
  const tournaments = await listTournaments();
  return (
    <div className="mt-12">
      {tournaments.length ? (
        <TournamentExplorer tournaments={tournaments} />
      ) : (
        <EmptyState
          title="Турниров пока нет."
          hint="Здесь будет история наших встреч — от первой карты до последнего GG."
        />
      )}
    </div>
  );
}
