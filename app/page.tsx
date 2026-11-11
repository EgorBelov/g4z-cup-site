import { Suspense } from "react";
import { BrandMark } from "@/components/brand/BrandMark";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { TournamentList } from "@/components/layout/TournamentList";
import { TournamentExplorer } from "@/components/layout/TournamentExplorer";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Container, Skeleton } from "@/components/ui/PageHeader";
import { listTournaments } from "@/lib/queries/public";
import { community } from "@/lib/community";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <Container>
          <section className="grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-2 lg:gap-12">
            <div>
              <span className="inline-flex items-center gap-2 rounded-pill border border-accent/25 bg-accent-soft px-3 py-1.5 text-xs text-accent">
                <Icon name="spark" className="size-4" />
                Игровое сообщество
              </span>
              <h1 className="hero-title my-8">
                G4Z
                <br />
                CUP
                <span className="ml-3 align-top font-mono text-sm tracking-normal text-accent">
                  [GG]
                </span>
              </h1>
              <p className="text-2xl leading-snug tracking-tight sm:text-3xl">
                Свои люди.
                <br />
                <span className="text-ink-muted">На одной орбите.</span>
              </p>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-faint">
                Собирай своих. Заходи в игру. Здесь каждый кубок — повод встретиться.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <ButtonLink href="#tournaments" variant="live">
                  <Icon name="trophy" />К турнирам
                  <Icon name="arrow" className="size-4" />
                </ButtonLink>
                <ButtonLink href="/archive" variant="secondary">
                  <Icon name="archive" className="size-4" />
                  История кубков
                </ButtonLink>
              </div>
              <div className="mt-7 flex flex-wrap gap-2">
                <span className="game-chip text-ember">
                  <Icon name="swords" className="size-4" />
                  Dota 2
                </span>
                <span className="game-chip text-violet">
                  <Icon name="target" className="size-4" />
                  CS2
                </span>
                <span className="game-chip text-ink-muted">
                  <Icon name="game" className="size-4" />И не только
                </span>
              </div>
            </div>
            <div className="grid min-w-0 gap-3">
              <div className="orbit-stage relative isolate overflow-hidden rounded-card border border-edge bg-panel px-4 pb-4 pt-5 sm:px-6">
                <div className="relative z-10 flex items-center justify-between gap-3">
                  <span className="eyebrow text-accent">Место встречи — G4Z</span>
                  <span aria-hidden="true" className="flex gap-1.5">
                    <span className="size-2 rounded-pill bg-ember" />
                    <span className="size-2 rounded-pill bg-violet" />
                    <span className="size-2 rounded-pill bg-accent" />
                  </span>
                </div>
                <BrandMark animated className="relative mx-auto w-full max-w-[400px]" />
                <p className="relative text-center text-xs text-ink-muted">
                  Разные игры. Одна команда своих.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {community.telegram ? (
                  <a
                    href={community.telegram}
                    target="_blank"
                    rel="noreferrer"
                    className="interactive-card group flex items-center gap-3 rounded-card border border-edge bg-panel p-4"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-control bg-accent-soft text-accent">
                      <Icon name="telegram" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">Наш Telegram</span>
                      <span className="mt-1 block text-xs text-ink-faint">
                        Анонсы и свои люди
                      </span>
                    </span>
                    <Icon name="arrow" className="size-4 text-accent" />
                  </a>
                ) : null}
                {community.stream ? (
                  <a
                    href={community.stream}
                    target="_blank"
                    rel="noreferrer"
                    className="interactive-card group flex items-center gap-3 rounded-card border border-edge bg-panel p-4"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-control bg-violet-soft text-violet">
                      <Icon name="play" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        Канал трансляций
                      </span>
                      <span className="mt-1 block text-xs text-ink-faint">
                        Болеем за своих
                      </span>
                    </span>
                    <Icon name="arrow" className="size-4 text-violet" />
                  </a>
                ) : null}
              </div>
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
      <section id="tournaments" className="pb-10 pt-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-control bg-accent-soft text-accent">
              <Icon name="trophy" className="size-6" />
            </span>
            <div>
              <p className="eyebrow mb-1">Следующая встреча — в игре</p>
              <h2 className="section-title">На нашей орбите</h2>
            </div>
          </div>
          <span className="rounded-pill border border-edge bg-panel px-3 py-2 font-mono text-xs text-ink-muted">
            {active.length} активных турниров
          </span>
        </div>
        {active.length ? (
          <TournamentExplorer tournaments={active} />
        ) : (
          <div className="grid items-center gap-6 rounded-card border border-edge bg-panel p-6 sm:grid-cols-[auto_1fr_auto] sm:p-8">
            <span className="grid size-20 place-items-center rounded-card bg-accent-soft text-accent">
              <Icon name="game" className="size-10" />
            </span>
            <div>
              <h3 className="text-2xl tracking-tight">Свои никуда не пропадают.</h3>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-muted">
                Готовимся к следующей встрече. А пока — сыгранные матчи, составы и
                лучшие моменты прошлых кубков.
              </p>
            </div>
            <ButtonLink href="/archive" variant="secondary">
              Заглянуть в архив
              <Icon name="arrow" className="size-4" />
            </ButtonLink>
          </div>
        )}
      </section>
      {finished.length ? (
        <section className="pt-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Icon name="archive" className="size-6 text-violet" />
              <h2 className="section-title">Последнее GG</h2>
            </div>
            <ButtonLink href="/archive" variant="ghost">
              Вся история
              <Icon name="arrow" className="size-4" />
            </ButtonLink>
          </div>
          <TournamentList tournaments={finished} />
        </section>
      ) : null}
    </>
  );
}
