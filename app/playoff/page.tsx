import Container from "@/components/layout/Container";
import PageHero from "@/components/ui/PageHero";
import SectionCard from "@/components/ui/SectionCard";
import StatusBadge from "@/components/ui/StatusBadge";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { getPlayoffMatches } from "@/lib/queries/matches";
import { getTournamentBySlug } from "@/lib/queries/tournaments";

export const dynamic = "force-dynamic";

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

type PlayoffMatch = {
  id: number;
  stage: string;
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

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function MatchCard({ match }: { match: PlayoffMatch }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 md:p-5 transition hover:-translate-y-0.5 hover:border-emerald-400/25 hover:bg-black/30">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0 text-sm text-white/45">{match.round_name}</div>
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

function StageColumn({
  title,
  badge,
  matches,
}: {
  title: string;
  badge: string;
  matches: PlayoffMatch[];
}) {
  return (
    <SectionCard className="flex h-full flex-col p-5 md:p-6">
      <div className="mb-5 flex min-h-[64px] flex-wrap items-start justify-between gap-3">
        <h2 className="min-w-0 max-w-full text-2xl font-bold leading-tight">
          {title}
        </h2>

        <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/55">
          {badge}
        </span>
      </div>

      <div className="flex-1 space-y-4">
        {matches.length > 0 ? (
          matches.map((match) => <MatchCard key={match.id} match={match} />)
        ) : (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-white/60">
            Нет матчей.
          </div>
        )}
      </div>
    </SectionCard>
  );
}

export default async function PlayoffPage() {
  const tournament = await getTournamentBySlug("g4z-cup-10");
  const matches = (await getPlayoffMatches(tournament.id)) as PlayoffMatch[];

  const playInMatches = matches.filter((m) => {
    const name = normalize(m.round_name);
    return name.includes("play-in") || name.includes("play in");
  });

  const quarterfinals = matches.filter((m) => {
    const name = normalize(m.round_name);
    return name.includes("quarterfinal");
  });

  const semifinals = matches.filter((m) => {
    const name = normalize(m.round_name);
    return name.includes("semifinal");
  });

  const finals = matches.filter((m) => {
    const name = normalize(m.round_name);
    return (
      name.includes("final") &&
      !name.includes("semi") &&
      !name.includes("quarter")
    );
  });

  return (
    <main className="bg-slate-950 text-white">
      <Container>
        <div className="py-8 md:py-12">
          <PageHero
            eyebrow="G4Z CUP"
            title="Плей-офф"
            description="1–2 места группы выходят сразу в полуфинал, 3–6 места начинают с четвертьфиналов. Play-In остается как резервная стадия для переигровок."
            // actions={[
            //   { href: "/", label: "На главную" },
            //   { href: "/schedule", label: "Расписание" },
            //   { href: "/groups", label: "Группы" },
            // ]}
          />

          <section className="mt-8 grid gap-6 xl:grid-cols-4">
            <StageColumn
              title="Play-In"
              badge="replay stage"
              matches={playInMatches}
            />

            <StageColumn
              title="Quarterfinals"
              badge="round 1"
              matches={quarterfinals}
            />

            <StageColumn
              title="Semifinals"
              badge="round 2"
              matches={semifinals}
            />

            <StageColumn title="Final" badge="grand final" matches={finals} />
          </section>
        </div>
      </Container>
    </main>
  );
}
