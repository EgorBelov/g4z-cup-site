import Container from "@/components/layout/Container";
import PageHero from "@/components/ui/PageHero";
import SectionCard from "@/components/ui/SectionCard";
import { finalStandings, tournamentMvp} from "@/lib/constants/final-standings";

function getPlaceLabel(place: number) {
  if (place === 1) return "1 место";
  if (place === 2) return "2 место";
  if (place === 3) return "3 место";
  return `${place} место`;
}

export default function ResultsPage() {
  const top3 = finalStandings.slice(0, 3);
  const rest = finalStandings.slice(3);

  return (
    <main className="bg-slate-950 text-white">
      <Container>
        <div className="py-8 md:py-12">
          <PageHero
            eyebrow="G4Z CUP"
            title="Итоговые результаты"
            description="Финальное распределение мест турнира."
            // actions={[
            //   { href: "/", label: "На главную" },
            //   { href: "/playoff", label: "Плей-офф" },
            //   { href: "/teams", label: "Команды" },
            // ]}
          />

          <section className="mt-8 grid gap-6 md:grid-cols-3">
            {top3.map((item, index) => {
              const styles =
                index === 0
                  ? "border-yellow-400/30 bg-yellow-500/10"
                  : index === 1
                    ? "border-slate-300/20 bg-slate-300/10"
                    : "border-amber-700/30 bg-amber-700/10";

              return (
                <SectionCard key={item.place} className={`p-6 ${styles}`}>
                  <div className="text-sm uppercase tracking-[0.2em] text-white/55">
                    {getPlaceLabel(item.place)}
                  </div>

                  <div className="mt-4 text-3xl font-extrabold tracking-tight">
                    {item.teamName}
                  </div>

                  {item.note && (
                    <div className="mt-3 text-sm text-white/65">{item.note}</div>
                  )}
                </SectionCard>
              );
            })}
          </section>
<section className="mt-8">
  <SectionCard className="border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 via-white/5 to-sky-500/10 p-6 md:p-8">
    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">
          Tournament MVP
        </p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
          {tournamentMvp.nickname}
        </h2>
        <p className="mt-3 text-white/70">
          Команда: <span className="font-medium text-white">{tournamentMvp.teamName}</span>
        </p>
        {tournamentMvp.note && (
          <p className="mt-2 text-white/60">{tournamentMvp.note}</p>
        )}
      </div>

      <div className="flex h-24 w-24 items-center justify-center rounded-[28px] text-4xl">
        🏆
      </div>
    </div>
  </SectionCard>
</section>
          <section className="mt-8">
            <SectionCard className="p-5 md:p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Все места</h2>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/55">
                  standings
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10">
                <table className="w-full text-left">
                  <thead className="bg-white/5 text-sm text-white/55">
                    <tr>
                      <th className="px-4 py-3">Место</th>
                      <th className="px-4 py-3">Команда</th>
                      <th className="px-4 py-3">Примечание</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalStandings.map((item) => (
                      <tr
                        key={item.place}
                        className="border-t border-white/10 bg-black/20"
                      >
                        <td className="px-4 py-3 font-semibold">
                          {getPlaceLabel(item.place)}
                        </td>
                        <td className="px-4 py-3 font-medium">{item.teamName}</td>
                        <td className="px-4 py-3 text-white/60">
                          {item.note ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </section>
        </div>
      </Container>
    </main>
  );
}