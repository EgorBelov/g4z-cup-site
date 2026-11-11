import Link from "next/link";
import type { Tournament } from "@/lib/types/database";
import { TournamentStatusBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function TournamentMasthead({ tournament }: { tournament: Tournament }) {
  const base = `/t/${tournament.slug}`;
  const displayName =
    tournament.edition && tournament.name.endsWith(` ${tournament.edition}`)
      ? tournament.name.slice(0, -String(tournament.edition).length - 1)
      : tournament.name;
  return (
    <section className="orbit-masthead orbit-frame" aria-label={tournament.name}>
      <nav className="orbit-breadcrumb" aria-label="Хлебные крошки">
        <Link href="/">Главная</Link>
        <span aria-hidden="true">/</span>
        <Link href="/archive">Турниры</Link>
        <span aria-hidden="true">/</span>
        <span>{tournament.name}</span>
      </nav>
      {tournament.edition ? (
        <span className="orbit-edition-watermark" aria-hidden="true">
          {tournament.edition}
        </span>
      ) : null}
      <p className="orbit-masthead-name">
        {displayName}
        {tournament.edition ? (
          <span className="text-accent"> / S{tournament.edition}</span>
        ) : null}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="orbit-season-status" data-status={tournament.status}>
          <TournamentStatusBadge status={tournament.status} />
        </span>
        <span className="orbit-game-label">
          <Icon name="game" className="size-4" />
          {tournament.game}
        </span>
      </div>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-muted">
        Турнир по {tournament.game}.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {tournament.registration_open ? (
          <ButtonLink href={`${base}/register`} variant="live">
            Участвовать <Icon name="arrow" className="size-4" />
          </ButtonLink>
        ) : (
          <ButtonLink href={`${base}/schedule`} variant="live">
            Расписание ↗
          </ButtonLink>
        )}
        <ButtonLink href={base} variant="secondary">
          О турнире
        </ButtonLink>
        {tournament.stream_url ? (
          <ButtonLink href={tournament.stream_url} variant="ghost" external>
            Смотреть эфир ↗
          </ButtonLink>
        ) : null}
      </div>
    </section>
  );
}
