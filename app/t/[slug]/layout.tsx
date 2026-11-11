import { Suspense, type ReactNode } from "react";
import { notFound } from "next/navigation";
import { SiteHeader, type NavLink } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { LiveRefresher } from "@/components/live/LiveRefresher";
import { Container, Skeleton } from "@/components/ui/PageHeader";
import { TournamentMasthead } from "@/components/layout/TournamentMasthead";
import { TournamentTabs } from "@/components/layout/TournamentTabs";
import { getTournament } from "@/lib/queries/public";
import { tournamentSlugParams } from "@/lib/queries/params";

export async function generateStaticParams() {
  return tournamentSlugParams();
}

export default function TournamentLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  return (
    <div className="orbit-tournament flex min-h-screen flex-col">
      <Suspense
        fallback={<Skeleton className="h-16 rounded-none border-x-0 border-t-0" />}
      >
        {params.then(({ slug }) => (
          <TournamentChrome slug={slug} />
        ))}
      </Suspense>

      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

async function TournamentChrome({ slug }: { slug: string }) {
  "use cache";

  const tournament = await getTournament(slug);
  if (!tournament) notFound();

  const base = `/t/${slug}`;
  const links: NavLink[] = [
    { href: base, label: "Обзор" },
    { href: `${base}/schedule`, label: "Расписание" },
    { href: `${base}/groups`, label: "Группы" },
    { href: `${base}/bracket`, label: "Плей-офф" },
    { href: `${base}/teams`, label: "Команды" },
    { href: `${base}/results`, label: "Итоги" },
    { href: "/archive", label: "Архив" },
  ];

  return (
    <>
      <SiteHeader
        streamUrl={tournament.stream_url}
        telegramUrl={tournament.telegram_url}
      />
      <Container>
        <TournamentMasthead tournament={tournament} />
        <TournamentTabs links={links} />
      </Container>
      <LiveRefresher
        tournamentId={tournament.id}
        enabled={tournament.status === "live"}
      />
    </>
  );
}
