import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/PageHeader";
import { Icon } from "@/components/ui/Icon";
import { community } from "@/lib/community";
import { getResults, getTournament, type ResultsPage } from "@/lib/queries/public";

type Props = { params: Promise<{ slug: string }> };

type PlacementView = ResultsPage["placements"][number];
type AwardView = ResultsPage["awards"][number];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  "use cache";
  const { slug } = await params;
  const tournament = await getTournament(slug);

  return {
    title: tournament ? `Итоги — ${tournament.name}` : "Итоги",
    description: "Финальные места, призёры и награды турнира.",
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

function placeNumber(place: number): string {
  return String(place).padStart(2, "0");
}

function TeamName({
  placement,
  slug,
  className,
  hit = false,
}: {
  placement: PlacementView;
  slug: string;
  className?: string;
  /** Растягивает ссылку на всю карточку: кликается вся плашка, не только имя. */
  hit?: boolean;
}) {
  const name = placement.team_name ?? "—";
  const classes = [className, hit ? "orbit-results-hit" : null]
    .filter(Boolean)
    .join(" ");
  if (!placement.team_slug) return <span className={className}>{name}</span>;
  return (
    <Link href={`/t/${slug}/teams/${placement.team_slug}`} className={classes}>
      {name}
    </Link>
  );
}

const awardTones = ["accent", "violet", "ember"] as const;

function Awards({ awards }: { awards: AwardView[] }) {
  return (
    <div className="orbit-results-awards">
      {awards.map((award, index) => (
        <div
          key={award.id}
          className="orbit-results-award orbit-frame"
          data-tone={awardTones[index % awardTones.length]}
        >
          <b>{award.title}</b>
          <strong>{award.nickname ?? "—"}</strong>
          {award.team_label ? <span>{award.team_label}</span> : null}
          {award.note ? <span>{award.note}</span> : null}
        </div>
      ))}
    </div>
  );
}

export default async function ResultsPage({ params }: Props) {
  const { slug } = await params;
  const tournament = await getTournament(slug);
  if (!tournament) notFound();

  const { placements, awards } = await getResults(slug);
  const sorted = [...placements].sort((a, b) => a.place - b.place);

  const champion = sorted.find((item) => item.place === 1) ?? null;
  const silver = sorted.find((item) => item.place === 2) ?? null;
  const bronze = sorted.find((item) => item.place === 3) ?? null;
  const rest = sorted.filter((item) => item.place > 3);
  const empty = sorted.length === 0 && awards.length === 0;

  return (
    <Container className="orbit-results">
      <div className="orbit-page-head">
        <div>
          <h1 className="orbit-page-title">Итоги</h1>
          <p className="orbit-page-sub">
            {sorted.length > 0
              ? `${sorted.length} ${plural(sorted.length, "команда", "команды", "команд")} · финальное распределение`
              : "Финальное распределение мест"}
          </p>
        </div>
      </div>

      {empty ? (
        <div className="orbit-page-empty orbit-frame">
          <Icon name="trophy" />
          <h2>Итоги ещё не подведены</h2>
          <p>
            Они появятся сразу после финала: места, призёры и индивидуальные награды
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
      ) : null}

      {champion ? (
        <section className="orbit-results-champ orbit-frame">
          <div className="orbit-results-champ-body">
            <p className="orbit-results-champ-label">Чемпион</p>
            <h2>
              <TeamName placement={champion} slug={slug} hit />
            </h2>
            <div className="orbit-results-champ-line">
              {champion.prize ? (
                <span className="orbit-results-money">{champion.prize}</span>
              ) : null}
              {champion.note ? <span>{champion.note}</span> : null}
              <span className="orbit-results-chip">золото</span>
            </div>
          </div>
          <svg className="orbit-results-cup" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 3h8v6a4 4 0 0 1-8 0V3ZM8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 13v5m-4 3h8m-7-3h6v3" />
          </svg>
          <span className="orbit-results-num" aria-hidden="true">
            {placeNumber(champion.place)}
          </span>
        </section>
      ) : null}

      {silver || bronze ? (
        <div className="orbit-results-medals">
          {silver ? (
            <section className="orbit-results-medal orbit-frame" data-metal="silver">
              <div className="orbit-results-medal-top">
                <span className="orbit-results-medal-place">
                  {placeNumber(silver.place)} место · серебро
                </span>
                {silver.prize ? (
                  <span className="orbit-results-money">{silver.prize}</span>
                ) : null}
              </div>
              <h3>
                <TeamName placement={silver} slug={slug} hit />
              </h3>
              {silver.note ? <p>{silver.note}</p> : null}
              <span className="orbit-results-medal-num" aria-hidden="true">
                {placeNumber(silver.place)}
              </span>
            </section>
          ) : null}

          {bronze ? (
            <section className="orbit-results-medal orbit-frame" data-metal="bronze">
              <div className="orbit-results-medal-top">
                <span className="orbit-results-medal-place">
                  {placeNumber(bronze.place)} место · бронза
                </span>
                {bronze.prize ? (
                  <span className="orbit-results-money">{bronze.prize}</span>
                ) : null}
              </div>
              <h3>
                <TeamName placement={bronze} slug={slug} hit />
              </h3>
              {bronze.note ? <p>{bronze.note}</p> : null}
              <span className="orbit-results-medal-num" aria-hidden="true">
                {placeNumber(bronze.place)}
              </span>
            </section>
          ) : null}
        </div>
      ) : null}

      {rest.length > 0 ? (
        <div className="orbit-results-rest">
          {rest.map((placement) => (
            <Link
              key={placement.id}
              href={
                placement.team_slug
                  ? `/t/${slug}/teams/${placement.team_slug}`
                  : `/t/${slug}`
              }
            >
              <span className="n">{placeNumber(placement.place)}</span>
              <span className="name">{placement.team_name ?? "—"}</span>
              <span className="arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      {awards.length > 0 ? <Awards awards={awards} /> : null}
    </Container>
  );
}
