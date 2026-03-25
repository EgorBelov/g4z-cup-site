import Link from "next/link";
import Container from "@/components/layout/Container";
import PageHero from "@/components/ui/PageHero";
import SectionCard from "@/components/ui/SectionCard";
import StatusBadge from "@/components/ui/StatusBadge";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { getPlayoffMatches } from "@/lib/queries/matches";
import { getTournamentBySlug } from "@/lib/queries/tournaments";

function formatMatchTime(value: string | null) {
  if (!value) return "TBD";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

type PlayoffMatch = {
  id: number;
  round_name: string;
  team1_name: string | null;
  team2_name: string | null;
  score1: number;
  score2: number;
  status: string;
  bo: string;
  scheduled_at: string | null;
  stream_url: string | null;
};

function MatchCard({ match }: { match: PlayoffMatch }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 md:p-5 transition hover:border-emerald-400/25 hover:bg-black/30">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-sm text-white/45">{match.round_name}</div>
        <StatusBadge status={match.status} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <span className="font-medium">{match.team1_name ?? "TBD"}</span>
          <span className="font-semibold text-white/80">
            {match.status === "finished" ? match.score1 : "-"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <span className="font-medium">{match.team2_name ?? "TBD"}</span>
          <span className="font-semibold text-white/80">
            {match.status === "finished" ? match.score2 : "-"}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/55">
        <span>{String(match.bo).toUpperCase()}</span>
        <span>{formatMatchTime(match.scheduled_at)}</span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <PrimaryButton href={`/matches/${match.id}`}>Матч</PrimaryButton>

        {match.stream_url && (
          <a
            href={match.stream_url}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl bg-purple-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-purple-500"
          >
            Стрим
          </a>
        )}
      </div>
    </div>
  );
}

export default async function PlayoffPage() {
  const tournament = await getTournamentBySlug("g4z-cup-10");
  const matches = await getPlayoffMatches(tournament.id);

  const quarterfinals = matches.filter((m) =>
    m.round_name.toLowerCase().includes("quarterfinal")
  );
  const semifinals = matches.filter((m) =>
    m.round_name.toLowerCase().includes("semifinal")
  );
  const finals = matches.filter((m) => {
    const name = m.round_name.toLowerCase();
    return name.includes("final") && !name.includes("semi") && !name.includes("quarter");
  });

  return (
    <main className="bg-slate-950 text-white">
      <Container>
        <div className="py-8 md:py-12">
          <PageHero
            eyebrow="G4Z CUP"
            title="Плей-офф"
            description="Турнирная сетка решающей стадии: четвертьфиналы, полуфиналы и финал."
            actions={[
              { href: "/", label: "На главную" },
              { href: "/schedule", label: "Расписание" },
              { href: "/groups", label: "Группы" },
            ]}
          />

          <section className="mt-8 grid gap-6 xl:grid-cols-3">
            <SectionCard className="p-5 md:p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Quarterfinals</h2>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/55">
                  round 1
                </span>
              </div>

              <div className="space-y-4">
                {quarterfinals.length > 0 ? (
                  quarterfinals.map((match) => <MatchCard key={match.id} match={match} />)
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-white/60">
                    Нет матчей.
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard className="p-5 md:p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Semifinals</h2>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/55">
                  round 2
                </span>
              </div>

              <div className="space-y-4">
                {semifinals.length > 0 ? (
                  semifinals.map((match) => <MatchCard key={match.id} match={match} />)
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-white/60">
                    Нет матчей.
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard className="p-5 md:p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Final</h2>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/55">
                  grand final
                </span>
              </div>

              <div className="space-y-4">
                {finals.length > 0 ? (
                  finals.map((match) => <MatchCard key={match.id} match={match} />)
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-white/60">
                    Нет матчей.
                  </div>
                )}
              </div>
            </SectionCard>
          </section>
        </div>
      </Container>
    </main>
  );
}