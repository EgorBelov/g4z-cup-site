import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { Container, PageHeader } from "@/components/ui/PageHeader";
import { getResults, getTournament } from "@/lib/queries/public";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  "use cache";
  const { slug } = await params;
  const tournament = await getTournament(slug);

  return {
    title: tournament ? `Итоги — ${tournament.name}` : "Итоги",
    description: "Финальные места, призёры и награды турнира.",
  };
}

export default async function ResultsPage({ params }: Props) {
  const { slug } = await params;
  const tournament = await getTournament(slug);
  if (!tournament) notFound();

  const { placements, awards } = await getResults(slug);
  const top3 = placements.filter((placement) => placement.place <= 3);

  return (
    <Container className="py-8 sm:py-12">
      <PageHeader
        eyebrow={tournament.name}
        title="Последнее GG."
        description="Финальное распределение мест и индивидуальные награды."
      />

      {placements.length === 0 && awards.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Итоги ещё не подведены"
            hint="Они появятся сразу после финала."
          />
        </div>
      ) : null}

      {top3.length > 0 ? (
        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {top3.map((placement) => (
            <div key={placement.id} className="border-t border-edge py-7">
              <p className="text-xs uppercase tracking-[0.2em] opacity-80">
                {placement.place} место
              </p>
              <p className="my-6 text-7xl font-normal tracking-[-0.06em] text-accent">
                {String(placement.place).padStart(2, "0")}
              </p>
              <p className="mt-3 break-words text-2xl font-normal tracking-tight text-ink">
                {placement.team_slug ? (
                  <Link
                    href={`/t/${slug}/teams/${placement.team_slug}`}
                    className="hover:underline"
                  >
                    {placement.team_name}
                  </Link>
                ) : (
                  (placement.team_name ?? "—")
                )}
              </p>
              {placement.note ? (
                <p className="mt-2 text-sm text-ink-muted">{placement.note}</p>
              ) : null}
              {placement.prize ? (
                <p className="mt-1 text-sm text-ink-faint">{placement.prize}</p>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {awards.length > 0 ? (
        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {awards.map((award) => (
            <Card key={award.id} className="py-7">
              <p className="text-xs uppercase tracking-[0.2em] text-accent">
                {award.title}
              </p>
              <p className="mt-3 text-2xl font-normal tracking-tight">
                {award.nickname ?? "—"}
              </p>
              {award.team_label ? (
                <p className="mt-2 text-sm text-ink-muted">{award.team_label}</p>
              ) : null}
              {award.note ? (
                <p className="mt-1 text-sm text-ink-faint">{award.note}</p>
              ) : null}
            </Card>
          ))}
        </section>
      ) : null}

      {placements.length > 0 ? (
        <Card className="mt-8">
          <CardHeader title="Все места" hint={`Команд: ${placements.length}`} />
          <div className="overflow-x-auto p-5">
            {/* No min width: three text columns wrap perfectly well, and forcing
                one only bought a sideways scroll on a phone. */}
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink-faint">
                <tr>
                  <th className="px-2 py-2.5 font-medium sm:px-3">Место</th>
                  <th className="px-2 py-2.5 font-medium sm:px-3">Команда</th>
                  <th className="px-2 py-2.5 font-medium sm:px-3">Примечание</th>
                </tr>
              </thead>
              <tbody>
                {placements.map((placement) => (
                  <tr key={placement.id} className="border-t border-edge">
                    <td className="px-2 py-3 font-semibold tabular-nums sm:px-3">
                      {placement.place}
                    </td>
                    <td className="px-2 py-3 sm:px-3">
                      {placement.team_slug ? (
                        <Link
                          href={`/t/${slug}/teams/${placement.team_slug}`}
                          className="font-medium hover:text-accent"
                        >
                          {placement.team_name}
                        </Link>
                      ) : (
                        (placement.team_name ?? "—")
                      )}
                    </td>
                    <td className="px-2 py-3 text-ink-faint sm:px-3">
                      {placement.note ?? placement.prize ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </Container>
  );
}
