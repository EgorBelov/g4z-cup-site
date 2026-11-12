import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Container, Skeleton } from "@/components/ui/PageHeader";
import { Icon } from "@/components/ui/Icon";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { listTournaments } from "@/lib/queries/public";
import { DEFAULT_TIME_ZONE } from "@/lib/format/date";
import type { TournamentSummary } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Архив турниров",
  description:
    "Все сезоны G4Z CUP: победители, составы, сетки и полное расписание каждого турнира.",
};

function plural(count: number, one: string, few: string, many: string): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

const MONTHS_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

function monthYear(value: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("ru-RU", {
    month: "numeric",
    year: "numeric",
    timeZone,
  }).formatToParts(new Date(value));
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "1");
  const year = parts.find((part) => part.type === "year")?.value;
  return `${MONTHS_GENITIVE[month - 1] ?? ""} ${year}`.trim();
}

function dayNumber(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", timeZone }).format(
    new Date(value),
  );
}

/** «3 — 9 августа 2026» или «3 августа — 9 сентября 2026». */
function rangeLabel(
  from: string | null,
  to: string | null,
  timeZone: string,
): string | null {
  if (!from && !to) return null;
  if (from && !to) return `${dayNumber(from, timeZone)} ${monthYear(from, timeZone)}`;
  if (!from && to) return monthYear(to, timeZone);
  const startMonth = monthYear(from!, timeZone);
  const endMonth = monthYear(to!, timeZone);
  const startDay = dayNumber(from!, timeZone);
  const endDay = dayNumber(to!, timeZone);
  return startMonth === endMonth
    ? `${startDay} — ${endDay} ${endMonth}`.trim()
    : `${startDay} ${startMonth} — ${endDay} ${endMonth}`.trim();
}

/** «с августа 2026» — месяц в родительном падеже после предлога. */
function sinceLabel(value: string | null, timeZone: string): string | null {
  if (!value) return null;
  const parts = new Intl.DateTimeFormat("ru-RU", {
    month: "numeric",
    year: "numeric",
    timeZone,
  }).formatToParts(new Date(value));
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "1");
  const year = parts.find((part) => part.type === "year")?.value;
  return `${MONTHS_GENITIVE[month - 1] ?? ""} ${year}`.trim();
}

function dateLine(tournament: TournamentSummary, timeZone: string): string {
  const parts: string[] = [];
  const when = rangeLabel(tournament.starts_at, tournament.ends_at, timeZone);
  if (when) parts.push(when);
  else parts.push("даты уточняются");
  if (tournament.game) parts.push(tournament.game);
  if (tournament.team_count > 0) {
    parts.push(
      `${tournament.team_count} ${plural(tournament.team_count, "команда", "команды", "команд")}`,
    );
  }
  if (tournament.match_count > 0) {
    parts.push(
      `${tournament.match_count} ${plural(tournament.match_count, "матч", "матча", "матчей")}`,
    );
  }
  return parts.join(" · ");
}

export default function ArchivePage() {
  return (
    <div className="orbit-community flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <Container className="orbit-archive">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <ArchiveView />
          </Suspense>
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}

async function ArchiveView() {
  "use cache";

  const tournaments = await listTournaments();
  const timeZone = DEFAULT_TIME_ZONE;

  const played = tournaments.filter((item) => item.status === "finished");
  const teams = tournaments.reduce((sum, item) => sum + item.team_count, 0);
  const matches = tournaments.reduce((sum, item) => sum + item.match_count, 0);

  const earliest = tournaments
    .map((item) => item.starts_at)
    .filter((value): value is string => Boolean(value))
    .sort()[0];
  const since = sinceLabel(earliest ?? null, timeZone);

  return (
    <>
      <div className="orbit-page-head">
        <div>
          <h1 className="orbit-page-title">Архив</h1>
          <p className="orbit-page-sub">
            История сообщества{since ? ` · с ${since}` : ""}
          </p>
        </div>
        <span className="orbit-groups-window">
          {tournaments.length}{" "}
          {plural(tournaments.length, "сезон", "сезона", "сезонов")}
        </span>
      </div>

      {tournaments.length === 0 ? (
        <div className="orbit-page-empty orbit-frame orbit-archive-empty">
          <Icon name="archive" />
          <h2>Турниров пока нет</h2>
          <p>
            Здесь будет история встреч сообщества: сезоны, чемпионы и все матчи — от первой
            карты до последнего GG.
          </p>
        </div>
      ) : (
        <>
          <dl className="orbit-archive-stats orbit-frame">
            <div>
              <dt>Сезонов сыграно</dt>
              <dd>{played.length}</dd>
            </div>
            <div>
              <dt>Команд</dt>
              <dd>{teams}</dd>
            </div>
            <div>
              <dt>Матчей</dt>
              <dd>{matches}</dd>
            </div>
          </dl>

          <div className="orbit-archive-seasons">
            {tournaments.map((tournament) => {
              const href = `/t/${tournament.slug}`;
              const edition = tournament.edition
                ? String(tournament.edition).padStart(2, "0")
                : "";
              const baseName = tournament.edition
                ? tournament.name.replace(new RegExp(`\\s*${tournament.edition}$`), "")
                : tournament.name;
              const decided = Boolean(tournament.champion_name);
              const finished = tournament.status === "finished";

              const card = (
                <>
                  <div className="orbit-archive-body">
                    <p className="orbit-archive-kicker">
                      {tournament.edition ? `Сезон ${tournament.edition}` : "Сезон"}
                    </p>
                    <h2 className="orbit-archive-name">
                      {decided ? (
                        baseName
                      ) : (
                        <Link href={href}>{baseName}</Link>
                      )}
                      {tournament.edition ? (
                        <span> / S{tournament.edition}</span>
                      ) : null}
                    </h2>
                    <p className="orbit-archive-date">
                      {dateLine(tournament, timeZone)}
                    </p>
                    <p className="orbit-archive-plate">
                      {decided ? (
                        <>
                          <Icon name="trophy" />
                          <span>
                            <strong>{tournament.champion_name}</strong> — чемпион
                          </span>
                          <span className="orbit-archive-arrow" aria-hidden="true">
                            ↗
                          </span>
                        </>
                      ) : finished ? (
                        <>
                          <span className="orbit-archive-state">
                            <i aria-hidden="true" />
                            чемпион не указан
                          </span>
                          <span className="orbit-archive-arrow" aria-hidden="true">
                            ↗
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="orbit-archive-state">
                            <i aria-hidden="true" />
                            чемпион не определён
                          </span>
                          {tournament.registration_open ? (
                            <Link
                              href={`${href}/register`}
                              className="orbit-archive-cta"
                            >
                              Участвовать ↗
                            </Link>
                          ) : (
                            <Link href={href} className="orbit-archive-cta">
                              О турнире ↗
                            </Link>
                          )}
                        </>
                      )}
                    </p>
                  </div>
                  {edition ? (
                    <span className="orbit-archive-watermark" aria-hidden="true">
                      {edition}
                    </span>
                  ) : null}
                </>
              );

              return decided ? (
                <Link
                  key={tournament.id}
                  href={href}
                  className="orbit-archive-season orbit-frame"
                >
                  {card}
                </Link>
              ) : (
                <div
                  key={tournament.id}
                  className="orbit-archive-season orbit-archive-current orbit-frame"
                >
                  {card}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
