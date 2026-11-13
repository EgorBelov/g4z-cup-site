import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/PageHeader";
import { Icon } from "@/components/ui/Icon";
import { formatDayRange } from "@/lib/format/date";
import { community } from "@/lib/community";
import { getStages, getStandings, getTournament } from "@/lib/queries/public";
import type { StandingRow } from "@/lib/types/database";

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
    title: tournament ? `Группы — ${tournament.name}` : "Группы",
    description:
      "Таблицы групп: победы, поражения, разница по картам и кто проходит дальше.",
  };
}

type GroupView = {
  id: number;
  name: string;
  rows: StandingRow[];
  advance: number;
};

function plural(count: number, one: string, few: string, many: string): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

function teamMark(row: StandingRow): string {
  if (row.team_tag) return row.team_tag.slice(0, 3).toUpperCase();
  return row.team_name
    .replace(/^Team\s+/i, "")
    .slice(0, 2)
    .toUpperCase();
}

export default async function GroupsPage({ params }: Props) {
  const { slug } = await params;
  const tournament = await getTournament(slug);
  if (!tournament) notFound();

  const [standings, stages] = await Promise.all([getStandings(slug), getStages(slug)]);

  const buckets = new Map<number, StandingRow[]>();
  for (const row of standings) {
    buckets.set(row.group_id, [...(buckets.get(row.group_id) ?? []), row]);
  }

  const groups: GroupView[] = [...buckets.entries()]
    .map(([id, rows]) => ({
      id,
      name: rows[0]?.group_name ?? "Группа",
      rows,
      advance: rows[0]?.advance_count ?? 0,
    }))
    .sort((a, b) => (a.rows[0]?.group_order ?? 0) - (b.rows[0]?.group_order ?? 0));

  const groupStage = stages.find((stage) => stage.id === standings[0]?.stage_id);
  const window = formatDayRange(
    groupStage?.starts_on ?? null,
    groupStage?.ends_on ?? null,
  );
  const teamCount = standings.length;
  const format = groupStage ? `BO${groupStage.best_of}` : null;
  const advance = groups[0]?.advance ?? 0;

  return (
    <Container className="orbit-groups">
      <div className="orbit-page-head">
        <div>
          <h1 className="orbit-page-title">Группы</h1>
          <p className="orbit-page-sub">
            {teamCount > 0
              ? `Групповой этап${format ? ` · ${format}` : ""} · ${teamCount} ${plural(teamCount, "команда", "команды", "команд")}`
              : "Групповой этап · формат уточняется"}
          </p>
        </div>
        {window ? <span className="orbit-groups-window">{window}</span> : null}
      </div>

      {groups.length === 0 ? (
        <div className="orbit-page-empty orbit-frame">
          <Icon name="grid" />
          <h2>Группы появятся после жеребьёвки</h2>
          <p>
            Команды разобьют по группам, когда закончится приём заявок. Число групп и
            состав зависят от количества участников — сетку соберём под фактический
            список команд.
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
      ) : (
        <>
          <div className="orbit-groups-grid">
            {groups.map((group) => (
              <section key={group.id} className="orbit-group orbit-frame">
                <div className="orbit-group-head">
                  <b>{group.name}</b>
                  <span>
                    {group.rows.length}{" "}
                    {plural(group.rows.length, "команда", "команды", "команд")}
                  </span>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Команда</th>
                      <th scope="col">И</th>
                      <th scope="col">В</th>
                      <th scope="col">Н</th>
                      <th scope="col">П</th>
                      <th scope="col">О</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row, index) => (
                      <tr
                        key={row.team_id}
                        data-advance={group.advance > 0 && index < group.advance}
                        data-cut={group.advance > 0 && index === group.advance - 1}
                      >
                        <td>{String(index + 1).padStart(2, "0")}</td>
                        <td>
                          <span className="orbit-team-cell">
                            <i aria-hidden="true">{teamMark(row)}</i>
                            <span>{row.team_name}</span>
                          </span>
                        </td>
                        <td>{row.played}</td>
                        <td>{row.wins}</td>
                        <td>{row.draws}</td>
                        <td>{row.losses}</td>
                        <td>{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="orbit-group-foot">
                  <i aria-hidden="true" />
                  {group.advance > 0
                    ? `1–${group.advance} места выходят в плей-офф`
                    : "плей-офф определит жеребьёвка"}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      <dl className="orbit-facts-row orbit-frame">
        <div>
          <dt>Формат</dt>
          <dd>{format ?? "Уточняется"}</dd>
        </div>
        <div>
          <dt>Групп</dt>
          <dd>{groups.length > 0 ? groups.length : "—"}</dd>
        </div>
        <div>
          <dt>В плей-офф</dt>
          <dd>{advance > 0 ? `по ${advance} из группы` : "Уточняется"}</dd>
        </div>
      </dl>
    </Container>
  );
}
