import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BracketView } from "@/components/bracket/BracketView";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/PageHeader";
import { Icon } from "@/components/ui/Icon";
import { formatDayRange } from "@/lib/format/date";
import { community } from "@/lib/community";
import { getBracket, getStages, getTournament } from "@/lib/queries/public";

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

function plural(count: number, one: string, few: string, many: string): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

export default async function BracketPage({ params }: Props) {
  const { slug } = await params;
  const tournament = await getTournament(slug);
  if (!tournament) notFound();

  const [matches, stages] = await Promise.all([getBracket(slug), getStages(slug)]);

  const bracketStages = stages.filter(
    (stage) => stage.kind === "single_elim" || stage.kind === "double_elim",
  );
  const window = formatDayRange(
    bracketStages[0]?.starts_on ?? null,
    bracketStages.at(-1)?.ends_on ?? null,
  );
  const bestOf = matches.reduce((top, match) => Math.max(top, match.best_of), 0);
  const format = bestOf > 0 ? `BO${bestOf}` : null;
  const rounds = new Set(matches.map((match) => `${match.stage_id}-${match.round}`))
    .size;

  return (
    <Container className="orbit-bracket-page">
      <div className="orbit-page-head">
        <div>
          <h1 className="orbit-page-title">Плей-офф</h1>
          <p className="orbit-page-sub">
            Сетка на выбывание{format ? ` · ${format}` : " · формат уточняется"}
          </p>
        </div>
        {window ? <span className="orbit-groups-window">{window}</span> : null}
      </div>

      {matches.length === 0 ? (
        <>
          <div className="orbit-page-empty orbit-frame">
            <Icon name="bracket" />
            <h2>Сетка появится после жеребьёвки</h2>
            <p>
              Когда команды займут места в группах, здесь соберётся сетка плей-офф:
              пары, серии и путь до финала. Сетка обновляется автоматически по ходу
              турнира.
            </p>
            {tournament.registration_open || community.telegram ? (
              <div>
                {tournament.registration_open ? (
                  <ButtonLink href={`/t/${slug}/register`} variant="live">
                    Подать заявку ↗
                  </ButtonLink>
                ) : null}
                {community.telegram ? (
                  <ButtonLink href={community.telegram} variant="secondary" external>
                    Следить в Telegram
                  </ButtonLink>
                ) : null}
              </div>
            ) : null}
          </div>

          <dl className="orbit-facts-row orbit-frame">
            <div>
              <dt>Формат</dt>
              <dd>Уточняется</dd>
            </div>
            <div>
              <dt>Раундов</dt>
              <dd>—</dd>
            </div>
            <div>
              <dt>Матчей</dt>
              <dd>—</dd>
            </div>
          </dl>
        </>
      ) : (
        <>
          <BracketView matches={matches} timeZone={tournament.time_zone} />

          <p className="orbit-page-note">
            {matches.length} {plural(matches.length, "матч", "матча", "матчей")} · сетка
            обновляется по ходу турнира
          </p>

          <dl className="orbit-facts-row orbit-frame">
            <div>
              <dt>Формат</dt>
              <dd>{format ?? "Уточняется"}</dd>
            </div>
            <div>
              <dt>Раундов</dt>
              <dd>{rounds}</dd>
            </div>
            <div>
              <dt>Матчей</dt>
              <dd>{matches.length}</dd>
            </div>
          </dl>
        </>
      )}
    </Container>
  );
}
