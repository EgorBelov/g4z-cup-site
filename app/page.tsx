import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { Container, PageHeader, Skeleton } from "@/components/ui/PageHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { getCurrentTournament, listTournaments } from "@/lib/queries/public";

/**
 * The home page always shows whatever tournament is current, without any slug
 * hardcoded in the codebase. Marking one as current in the admin panel is the
 * only thing needed to switch seasons.
 */
export default function HomePage() {
  return (
    <Suspense fallback={<Skeleton className="h-screen rounded-none border-0" />}>
      <CurrentTournamentGate />
    </Suspense>
  );
}

async function CurrentTournamentGate() {
  const current = await getCurrentTournament();

  if (current) {
    redirect(`/t/${current.slug}`);
  }

  const archive = await listTournaments();

  return (
    <main className="flex min-h-screen flex-col">
      <Container className="flex-1 py-16">
        <PageHeader
          eyebrow="G4Z CUP"
          title="Сейчас активного турнира нет"
          description="Как только организаторы отметят следующий турнир текущим, он появится здесь. А пока — архив прошлых сезонов."
          actions={<ButtonLink href="/archive">Открыть архив</ButtonLink>}
        />

        {archive.length > 0 ? (
          <ul className="mt-10 grid gap-3 sm:grid-cols-2">
            {archive.slice(0, 6).map((tournament) => (
              <li key={tournament.id}>
                <Link
                  href={`/t/${tournament.slug}`}
                  className="flex items-center justify-between gap-4 rounded-card border border-edge bg-panel px-5 py-4 transition hover:border-accent/40"
                >
                  <span className="font-semibold">{tournament.name}</span>
                  <span className="text-sm text-ink-faint">
                    {tournament.champion_name ?? "результаты"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </Container>
      <SiteFooter />
    </main>
  );
}
