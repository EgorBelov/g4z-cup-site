import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, PageHeader } from "@/components/ui/PageHeader";
import { BracketView } from "@/components/bracket/BracketView";
import { getBracket, getTournament } from "@/lib/queries/public";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return metadataFor(slug);
}

// `params` is runtime data, so it is resolved above and only the plain
// values are passed into this cached scope.
async function metadataFor(slug: string): Promise<Metadata> {
  "use cache";
  const tournament = await getTournament(slug);

  return {
    title: tournament ? `Плей-офф — ${tournament.name}` : "Плей-офф",
    description: "Сетка плей-офф: победители продвигаются автоматически.",
  };
}

export default async function BracketPage({ params }: Props) {
  const { slug } = await params;
  const tournament = await getTournament(slug);
  if (!tournament) notFound();

  const matches = await getBracket(slug);

  return (
    <Container className="py-8 sm:py-12">
      <PageHeader
        eyebrow={tournament.name}
        title="Плей-офф"
        description="Сетка строится по связям матчей: победитель попадает в следующий матч сам."
      />

      <div className="mt-8">
        <BracketView matches={matches} timeZone={tournament.time_zone} />
      </div>
    </Container>
  );
}
