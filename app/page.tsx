import Link from "next/link";
import Container from "@/components/layout/Container";
import { getTournamentBySlug } from "@/lib/queries/tournaments";
import {
  getLatestResults,
  getLiveMatch,
  getUpcomingMatches,
} from "@/lib/queries/matches";

function formatMatchTime(value: string | null) {
  if (!value) return "TBD";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(new Date(value));
}

export default async function HomePage() {
  const tournament = await getTournamentBySlug("g4z-cup-10");

  const [liveMatch, upcomingMatches, latestResults] = await Promise.all([
    getLiveMatch(tournament.id),
    getUpcomingMatches(tournament.id, 4),
    getLatestResults(tournament.id, 4),
  ]);

  return (
    <main className="bg-slate-950 text-white">
      <Container>
        <div className="py-8 md:py-12">
          {/* <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-emerald-500/12 via-white/6 to-sky-500/10 p-6 md:p-10">
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-sky-400/10 blur-3xl" />

            <div className="relative max-w-3xl">
              <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-1 text-sm font-medium text-emerald-300">
                Юбилейный турнир
              </div>

              <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                {tournament.title}
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                Весенний турнир по Dota 2 с группами, плей-офф сеткой,
                расписанием, результатами и страницами матчей в одном месте.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/schedule"
                  className="rounded-2xl bg-emerald-600 px-5 py-3 font-medium text-white transition hover:bg-emerald-500"
                >
                  Смотреть расписание
                </Link>
                <Link
                  href="/playoff"
                  className="rounded-2xl border border-white/10 bg-white/7 px-5 py-3 font-medium text-white transition hover:bg-white/10"
                >
                  Смотреть плей-офф
                </Link>
                <Link
                  href="/groups"
                  className="rounded-2xl border border-white/10 bg-white/7 px-5 py-3 font-medium text-white transition hover:bg-white/10"
                >
                  Группы
                </Link>
              </div>

              <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm text-white/45">Формат</div>
                  <div className="mt-1 font-semibold">{tournament.format}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm text-white/45">Игра</div>
                  <div className="mt-1 font-semibold">Dota 2</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm text-white/45">Статус</div>
                  <div className="mt-1 font-semibold capitalize">
                    {tournament.status}
                  </div>
                </div>
              </div>
            </div>
          </section> */}
          <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-emerald-500/12 via-white/6 to-sky-500/10 p-6 md:p-10">
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-sky-400/10 blur-3xl" />

            <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1.2fr)_320px] lg:gap-10">
              <div className="min-w-0">
                <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-1 text-sm font-medium text-emerald-300">
                  Юбилейный турнир
                </div>

                <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                  {tournament.title}
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                  Весенний турнир по Dota 2 с группами, плей-офф сеткой,
                  расписанием, результатами и страницами матчей в одном месте.
                </p>

                <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
                    <div className="text-sm text-white/45">Формат</div>
                    <div className="mt-1 font-semibold">
                      {tournament.format}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
                    <div className="text-sm text-white/45">Игра</div>
                    <div className="mt-1 font-semibold">Dota 2</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
                    <div className="text-sm text-white/45">Статус</div>
                    <div className="mt-1 font-semibold capitalize">
                      {tournament.status}
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative flex items-center justify-center lg:justify-end">
                <div className="absolute h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl md:h-72 md:w-72" />
                <div className="absolute h-40 w-40 rounded-full bg-sky-400/10 blur-2xl md:h-52 md:w-52" />

                {/* 👇 РАМКА */}
                <div className="relative z-10 rounded-[28px] border border-white/10 bg-white/5 p-4 backdrop-blur-md shadow-[0_0_40px_rgba(16,185,129,0.15)]">
                  <img
                    src="/image.png"
                    alt="G4Z CUP"
                    className="h-32 w-32 object-contain sm:h-40 sm:w-40 md:h-48 md:w-48 lg:h-56 lg:w-56"
                  />
                </div>
              </div>
            </div>
          </section>
          <section className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_1.4fr]">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Live now</h2>
                <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-300">
                  live
                </span>
              </div>

              {liveMatch ? (
                <div className="mt-5">
                  <div className="text-sm text-white/45">
                    {liveMatch.stage === "group"
                      ? (liveMatch.group_name ?? "Group Stage")
                      : liveMatch.round_name}
                  </div>

                  <div className="mt-3 text-2xl font-bold leading-tight">
                    {liveMatch.team1_name ?? "TBD"} vs{" "}
                    {liveMatch.team2_name ?? "TBD"}
                  </div>

                  <div className="mt-3 text-sm text-white/60">
                    {String(liveMatch.bo).toUpperCase()}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <a
                      href={
                        liveMatch.stream_url || tournament.twitch_url || "#"
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl bg-red-600 px-4 py-3 font-medium text-white transition hover:bg-red-500"
                    >
                      Смотреть матч
                    </a>

                    <Link
                      href={`/matches/${liveMatch.id}`}
                      className="rounded-2xl border border-white/10 bg-white/7 px-4 py-3 font-medium transition hover:bg-white/10"
                    >
                      Страница матча
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="mt-5 text-white/60">
                  Сейчас нет активного матча.
                </p>
              )}
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Быстрые разделы</h2>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Link
                  href="/schedule"
                  className="rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-emerald-400/30 hover:bg-black/30"
                >
                  <div className="text-lg font-semibold">Расписание</div>
                  <p className="mt-2 text-sm leading-6 text-white/60">
                    Все матчи турнира, статус, время и ссылки на стрим.
                  </p>
                </Link>

                <Link
                  href="/groups"
                  className="rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-emerald-400/30 hover:bg-black/30"
                >
                  <div className="text-lg font-semibold">Группы</div>
                  <p className="mt-2 text-sm leading-6 text-white/60">
                    Таблицы групп и матчи группового этапа.
                  </p>
                </Link>

                <Link
                  href="/playoff"
                  className="rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-emerald-400/30 hover:bg-black/30"
                >
                  <div className="text-lg font-semibold">Плей-офф</div>
                  <p className="mt-2 text-sm leading-6 text-white/60">
                    Сетка решающей стадии и результаты серий.
                  </p>
                </Link>

                <Link
                  href="/teams"
                  className="rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-emerald-400/30 hover:bg-black/30"
                >
                  <div className="text-lg font-semibold">Команды</div>
                  <p className="mt-2 text-sm leading-6 text-white/60">
                    Составы участников и страницы команд.
                  </p>
                </Link>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Ближайшие матчи</h2>
                <Link
                  href="/schedule"
                  className="text-sm text-emerald-300 hover:text-emerald-200"
                >
                  Все матчи
                </Link>
              </div>

              <div className="mt-5 space-y-3">
                {upcomingMatches.length > 0 ? (
                  upcomingMatches.map((match) => (
                    <Link
                      key={match.id}
                      href={`/matches/${match.id}`}
                      className="block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-emerald-400/30 hover:bg-black/30"
                    >
                      <div className="text-sm text-white/45">
                        {match.stage === "group"
                          ? (match.group_name ?? match.round_name)
                          : match.round_name}
                      </div>
                      <div className="mt-1 text-lg font-semibold">
                        {match.team1_name ?? "TBD"} vs{" "}
                        {match.team2_name ?? "TBD"}
                      </div>
                      <div className="mt-2 text-sm text-white/60">
                        {formatMatchTime(match.scheduled_at)}
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-white/60">Нет ближайших матчей.</p>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Последние результаты</h2>
                <Link
                  href="/schedule"
                  className="text-sm text-emerald-300 hover:text-emerald-200"
                >
                  Смотреть всё
                </Link>
              </div>

              <div className="mt-5 space-y-3">
                {latestResults.length > 0 ? (
                  latestResults.map((match) => (
                    <Link
                      key={match.id}
                      href={`/matches/${match.id}`}
                      className="block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-emerald-400/30 hover:bg-black/30"
                    >
                      <div className="text-sm text-white/45">
                        {match.stage === "group"
                          ? (match.group_name ?? match.round_name)
                          : match.round_name}
                      </div>
                      <div className="mt-1 text-lg font-semibold">
                        {match.team1_name ?? "TBD"}{" "}
                        <span className="text-emerald-300">
                          {match.score1}:{match.score2}
                        </span>{" "}
                        {match.team2_name ?? "TBD"}
                      </div>
                      <div className="mt-2 text-sm text-white/60">
                        {formatMatchTime(match.scheduled_at)}
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-white/60">Пока нет завершенных матчей.</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </Container>
    </main>
  );
}
