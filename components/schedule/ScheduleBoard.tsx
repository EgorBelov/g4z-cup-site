import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { MatchStatus } from "@/lib/types/database";

/**
 * Расписание: разметка из утверждённого макета. Компонент намеренно без
 * состояния — показывает то, что уже отдаёт страница, ничего не фильтрует
 * и не запрашивает.
 */

export type ScheduleRowView = {
  id: number;
  href: string;
  time: string;
  team1: string;
  team2: string;
  mark1: string;
  mark2: string;
  score1: number;
  score2: number;
  played: boolean;
  status: MatchStatus;
  meta: string;
};

export type ScheduleDayView = {
  key: string;
  label: string;
  matches: ScheduleRowView[];
};

const statusLabels: Record<MatchStatus, string> = {
  scheduled: "ожидается",
  live: "идёт сейчас",
  finished: "завершён",
  cancelled: "отменён",
};

function shortZone(timeZone: string): string {
  if (timeZone === "Europe/Moscow") return "МСК";
  const city = timeZone.split("/").at(-1) ?? timeZone;
  return city.replace(/_/g, " ").toUpperCase();
}

function plural(count: number, one: string, few: string, many: string): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

function matchesLabel(count: number): string {
  return `${count} ${plural(count, "матч", "матча", "матчей")}`;
}

function ScheduleLine({ row, tzBadge }: { row: ScheduleRowView; tzBadge: string }) {
  const live = row.status === "live";
  return (
    <Link href={row.href} className="orbit-schedule-row" data-status={row.status}>
      <span className="orbit-schedule-time">
        {row.time}
        <em>{tzBadge}</em>
      </span>
      <span className="orbit-schedule-team orbit-schedule-team--a">
        <span>{row.team1}</span>
        <i className="orbit-schedule-mark" aria-hidden="true">
          {row.mark1}
        </i>
      </span>
      <span className="orbit-schedule-score">
        {row.played ? (
          <>
            <span>{row.score1}</span>
            <i aria-hidden="true">:</i>
            <span>{row.score2}</span>
          </>
        ) : (
          <>
            <i aria-hidden="true">—</i>
            <i aria-hidden="true">:</i>
            <i aria-hidden="true">—</i>
          </>
        )}
      </span>
      <span className="orbit-schedule-team orbit-schedule-team--b">
        <i className="orbit-schedule-mark" aria-hidden="true">
          {row.mark2}
        </i>
        <span>{row.team2}</span>
      </span>
      <span className="orbit-schedule-meta">
        <span className="orbit-schedule-chip" data-status={row.status}>
          {live ? <i aria-hidden="true" /> : null}
          {statusLabels[row.status]}
        </span>
        <small>{row.meta}</small>
      </span>
      <span className="orbit-schedule-arrow" aria-hidden="true">
        ↗
      </span>
    </Link>
  );
}

export function ScheduleBoard({
  days,
  timeZone,
  empty,
}: {
  days: ScheduleDayView[];
  timeZone: string;
  empty: { registrationOpen: boolean; registerHref: string; telegram: string | null };
}) {
  const tzBadge = shortZone(timeZone);
  const unit = timeZone === "Europe/Moscow" ? "московское" : tzBadge;
  const total = days.reduce((sum, day) => sum + day.matches.length, 0);

  return (
    <>
      <div className="orbit-page-head">
        <div>
          <h1 className="orbit-page-title">Расписание</h1>
          <p className="orbit-page-sub">
            {total > 0 ? `Все матчи турнира · Время ${unit}` : "Время " + unit}
          </p>
        </div>
      </div>

      {total === 0 ? (
        <>
          <div className="orbit-schedule-day">
            <b>Даты уточняются</b>
            <span>0 матчей</span>
          </div>
          <div className="orbit-page-empty orbit-frame">
            <Icon name="calendar" />
            <h2>Расписание появится после жеребьёвки</h2>
            <p>
              {empty.registrationOpen
                ? "Заявки ещё принимаются. Как только составы подтвердят, здесь появятся дни, время начала и сетка матчей."
                : "Матчи появятся здесь, как только организаторы опубликуют этапы турнира."}
            </p>
            {empty.registrationOpen || empty.telegram ? (
              <div>
                {empty.registrationOpen ? (
                  <ButtonLink href={empty.registerHref} variant="live">
                    Подать заявку ↗
                  </ButtonLink>
                ) : null}
                {empty.telegram ? (
                  <ButtonLink href={empty.telegram} variant="secondary" external>
                    Следить в Telegram
                  </ButtonLink>
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <>
          {days.map((day) => (
            <section key={day.key}>
              <div className="orbit-schedule-day">
                <b>{day.label}</b>
                <span>{matchesLabel(day.matches.length)}</span>
              </div>
              <div className="orbit-schedule-list orbit-frame">
                {day.matches.map((row) => (
                  <ScheduleLine key={row.id} row={row} tzBadge={tzBadge} />
                ))}
              </div>
            </section>
          ))}

          <p className="orbit-page-note">
            Всего матчей: {total} · время указано в часовом поясе турнира
          </p>
        </>
      )}
    </>
  );
}
