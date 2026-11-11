import { Suspense } from "react";
import Link from "next/link";
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
    <div className="orbit-community flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <section className="orbit-home-hero">
          <Container>
            <div className="orbit-home-copy">
              <p className="orbit-eyebrow">Игровое сообщество / G4Z CUP</p>
              <h1 className="orbit-home-title">
                <span className="sr-only">G4Z CUP — </span>Твоя игра.
                <br />
                Наша <span>орбита.</span>
              </h1>
              <p className="orbit-home-description">Собирай своих. Заходи в игру.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="#tournaments" variant="live">
                  К турнирам <Icon name="arrow" className="size-4" />
                </ButtonLink>
                <ButtonLink href="#community" variant="secondary">
                  О сообществе
                </ButtonLink>
              </div>
            </div>
          </Container>
          <span className="orbit-hero-caption eyebrow">На одной орбите —</span>
        </section>
        <Container>
          <Suspense fallback={<Skeleton className="mt-10 h-60" />}>
            <CommunityTournaments />
          </Suspense>
          <section id="community" className="orbit-community-band orbit-frame">
            <div>
              <p className="orbit-eyebrow">Место встречи — G4Z</p>
              <h2 className="orbit-section-title mt-5">
                Свои люди. <span className="text-accent">Одна орбита.</span>
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-muted">
                Разные игры. Одна команда своих. Собираемся, играем и болеем за друзей.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {community.telegram ? (
                <ButtonLink href={community.telegram} variant="secondary" external>
                  <Icon name="telegram" />
                  Telegram ↗
                </ButtonLink>
              ) : null}
              {community.stream ? (
                <ButtonLink href={community.stream} variant="secondary" external>
                  <Icon name="play" />
                  Канал трансляций ↗
                </ButtonLink>
              ) : null}
            </div>
          </section>
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
  const base = active[0] ? `/t/${active[0].slug}` : null;
  return (
    <>
      <section id="tournaments" className="orbit-home-section">
        <div className="orbit-section-heading">
          <h2 className="orbit-section-title">На нашей орбите</h2>
          <span className="eyebrow">{active.length} активных турниров</span>
        </div>
        {active.length ? (
          <TournamentExplorer tournaments={active} featured />
        ) : (
          <div className="orbit-surface flex flex-wrap items-center justify-between gap-6 p-8">
            <div>
              <h3 className="section-title">Свои никуда не пропадают.</h3>
              <p className="mt-3 max-w-lg text-sm text-ink-muted">
                Готовимся к следующей встрече. А пока — сыгранные матчи, составы и
                лучшие моменты прошлых кубков.
              </p>
            </div>
            <ButtonLink href="/archive" variant="secondary">
              Заглянуть в архив ↗
            </ButtonLink>
          </div>
        )}
      </section>
      <section className="orbit-home-section">
        <div className="orbit-section-heading">
          <h2 className="orbit-section-title">Турнир ближе, чем кажется</h2>
        </div>
        <div className="orbit-editorial-grid">
          {(
            [
              {
                title: "Команды",
                text: "Составы и участники",
                icon: "users",
                href: base ? `${base}/teams` : "/archive",
              },
              {
                title: "Матчи",
                text: "Расписание и результаты",
                icon: "calendar",
                href: base ? `${base}/schedule` : "/archive",
              },
              {
                title: "Архив",
                text: "История наших кубков",
                icon: "archive",
                href: "/archive",
              },
            ] as const
          ).map((item, index) => (
            <Link
              className="orbit-editorial-card orbit-frame"
              href={item.href}
              key={item.title}
            >
              <span className="eyebrow">0{index + 1}</span>
              <Icon name={item.icon} className="my-6 size-8 text-accent" />
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <Icon name="arrow" className="orbit-card-arrow size-5" />
            </Link>
          ))}
        </div>
      </section>
      {finished.length ? (
        <details className="orbit-home-archive">
          <summary>Прошлые кубки ↗</summary>
          <div className="orbit-section-heading">
            <h2 className="orbit-section-title">Последнее GG</h2>
            <ButtonLink href="/archive" variant="ghost">
              Вся история ↗
            </ButtonLink>
          </div>
          <TournamentList tournaments={finished} />
        </details>
      ) : null}
    </>
  );
}
