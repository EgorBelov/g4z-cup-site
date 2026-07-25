import { notFound } from "next/navigation";
import { AdminShell, tournamentTabs } from "@/components/admin/AdminShell";
import { DeleteTeamButton, RosterForm, TeamForm } from "@/components/admin/TeamForms";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/auth/guard";
import {
  adminGroups,
  adminTeamWithPlayers,
  adminTournament,
} from "@/lib/queries/admin";

type Props = { params: Promise<{ slug: string; id: string }> };

export default async function AdminTeamPage({ params }: Props) {
  await requireAdmin();

  const { slug, id } = await params;
  const teamId = Number(id);
  if (!Number.isInteger(teamId) || teamId <= 0) notFound();

  const [tournament, data] = await Promise.all([
    adminTournament(slug),
    adminTeamWithPlayers(teamId),
  ]);

  if (!tournament || !data || data.team.tournament_id !== tournament.id) {
    notFound();
  }

  const groups = await adminGroups(tournament.id);

  return (
    <AdminShell
      title={data.team.name}
      subtitle={`Команда турнира ${tournament.name}`}
      tabs={tournamentTabs(slug)}
      activeHref={`/admin/t/${slug}/teams`}
      publicHref={`/t/${slug}/teams/${data.team.slug}`}
      actions={
        <ButtonLink href={`/admin/t/${slug}/teams`} variant="secondary" size="sm">
          ← Все команды
        </ButtonLink>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Данные команды" />
          <div className="p-5">
            <TeamForm tournamentId={tournament.id} groups={groups} team={data.team} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Состав"
            hint={`Заявлено игроков: ${data.players.length}`}
          />
          <div className="p-5">
            <RosterForm teamId={data.team.id} players={data.players} />
          </div>
        </Card>
      </div>

      <Card className="mt-6 border-live/30">
        <CardHeader
          title="Удаление команды"
          hint="Матчи команды останутся, но потеряют участника"
        />
        <div className="p-5">
          <DeleteTeamButton tournamentId={tournament.id} teamId={data.team.id} />
        </div>
      </Card>
    </AdminShell>
  );
}
