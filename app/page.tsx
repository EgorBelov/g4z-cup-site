import { Suspense } from "react";
import { BrandMark } from "@/components/brand/BrandMark";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { TournamentList } from "@/components/layout/TournamentList";
import { ButtonLink } from "@/components/ui/Button";
import { Container, Skeleton } from "@/components/ui/PageHeader";
import { listTournaments } from "@/lib/queries/public";
import { community } from "@/lib/community";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <Container>
          <section className="grid items-center gap-6 py-12 sm:py-16 lg:grid-cols-2 lg:gap-16 lg:py-20">
            <div>
              <p className="eyebrow">Игровое сообщество / Dota 2 · CS2 · и не только</p>
              <h1 className="hero-title my-9">
                G4Z
                <br />
                CUP
                <span className="ml-3 align-top font-mono text-sm tracking-normal text-accent">
                  [GG]
                </span>
              </h1>
              <p className="text-lg leading-relaxed sm:text-xl">
                Свои люди.
                <br />
                На одной орбите.
              </p>
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-faint">
                Собираемся ради игры. Встречаемся на турнирах. Остаёмся сообществом
                между сезонами.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <ButtonLink href="#tournaments">
                  К турнирам <span aria-hidden="true">↗</span>
                </ButtonLink>
                {community.telegram ? (
                  <ButtonLink href={community.telegram} variant="secondary" external>
                    Наш Telegram ↗
                  </ButtonLink>
                ) : null}
              </div>
            </div>
            <div className="mx-auto w-full max-w-[520px] py-3 lg:max-w-none">
              <BrandMark animated className="w-full" />
              <p className="eyebrow text-center tracking-[0.5em]">G4Z CUP</p>
            </div>
          </section>
          <Suspense fallback={<Skeleton className="h-60" />}>
            <CommunityTournaments />
          </Suspense>
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}

async function CommunityTournaments() {
  const tournaments = await listTournaments();
  const active = tournaments
    .filter((t) => t.status === "live" || t.status === "upcoming")
    .sort((a, b) => Number(b.is_current) - Number(a.is_current));
  const finished = tournaments.filter((t) => t.status === "finished").slice(0, 3);
  return (
    <>
      <section id="tournaments" className="pb-10 pt-4">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">Следующая встреча — в игре</p>
            <h2 className="section-title">На нашей орбите</h2>
          </div>
          <span className="eyebrow">{active.length} активных турниров</span>
        </div>
        {active.length ? (
          <TournamentList tournaments={active} />
        ) : (
          <div className="grid gap-6 border-y border-edge py-10 sm:grid-cols-2">
            <h3 className="text-3xl font-normal tracking-tight sm:text-4xl">
              Свои никуда
              <br />
              не пропадают.
            </h3>
            <div>
              <p className="max-w-md text-sm leading-relaxed text-ink-muted">
                Сейчас активных турниров нет. Новый кубок появится здесь, а сыгранные
                матчи, составы и результаты всегда можно найти в архиве.
              </p>
              <div className="mt-6">
                <ButtonLink href="/archive" variant="secondary">
                  Заглянуть в архив ↗
                </ButtonLink>
              </div>
            </div>
          </div>
        )}
      </section>
      {finished.length ? (
        <section className="pt-6">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <h2 className="section-title">Последнее GG</h2>
            <ButtonLink href="/archive" variant="ghost">
              Вся история ↗
            </ButtonLink>
          </div>
          <TournamentList tournaments={finished} />
        </section>
      ) : null}
    </>
  );
}
