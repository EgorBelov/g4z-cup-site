import { notFound } from "next/navigation";
import { AdminShell, tournamentTabs } from "@/components/admin/AdminShell";
import {
  DeleteMatchButton,
  MatchForm,
  StatusButtons,
} from "@/components/admin/MatchForms";
import { GameEditor } from "@/components/admin/GameForms";
import { ButtonLink } from "@/components/ui/Button";
import { MatchStatusBadge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/auth/guard";
import {
  adminGroups,
  adminMatch,
  adminStages,
  adminTeams,
  adminTournament,
  heroes as loadHeroes,
} from "@/lib/queries/admin";

type Props = { params: Promise<{ slug: string; id: string }> };

export default async function AdminMatchPage({ params }: Props) {
  await requireAdmin();

  const { slug, id } = await params;
  const matchId = Number(id);
  if (!Number.isInteger(matchId) || matchId <= 0) notFound();

  const [tournament, data] = await Promise.all([
    adminTournament(slug),
    adminMatch(matchId),
  ]);

  if (!tournament || !data || data.match.tournament_id !== tournament.id) {
    notFound();
  }

  const [stages, groups, teams, heroList] = await Promise.all([
    adminStages(tournament.id),
    adminGroups(tournament.id),
    adminTeams(tournament.id),
    loadHeroes(),
  ]);

  const { match, games, picks, bans, rosters } = data;

  return (
    <AdminShell
      title={`${match.team1_name ?? "TBD"} — ${match.team2_name ?? "TBD"}`}
      subtitle={`Матч #${match.id} · ${match.stage_name}${
        match.round_label ? ` · ${match.round_label}` : ""
      }`}
      tabs={tournamentTabs(slug)}
      activeHref={`/admin/t/${slug}/matches`}
      publicHref={`/t/${slug}/matches/${match.id}`}
      actions={
        <>
          <MatchStatusBadge status={match.status} />
          <ButtonLink href={`/admin/t/${slug}/live`} variant="live" size="sm">
            Ведение матча
          </ButtonLink>
        </>
      }
    >
      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-faint">
              Счёт серии (считается по картам)
            </p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums">
              {match.score1} : {match.score2}
            </p>
          </div>
          <StatusButtons match={match} />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Карты и драфт"
          hint="Счёт, победитель серии и продвижение по сетке пересчитываются автоматически"
        />
        <div className="p-5">
          <GameEditor
            match={match}
            games={games}
            picks={picks}
            bans={bans}
            rosters={rosters}
            heroes={heroList}
          />
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Параметры матча" />
        <div className="p-5">
          <MatchForm
            tournamentId={tournament.id}
            timeZone={tournament.time_zone}
            stages={stages}
            groups={groups}
            teams={teams}
            match={match}
          />
        </div>
      </Card>

      <Card className="mt-6 border-live/30">
        <CardHeader title="Удаление матча" hint="Вместе с картами и драфтами" />
        <div className="p-5">
          <DeleteMatchButton tournamentId={tournament.id} matchId={match.id} />
        </div>
      </Card>
    </AdminShell>
  );
}
