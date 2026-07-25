import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell, tournamentTabs } from "@/components/admin/AdminShell";
import { GroupPicker, TeamForm } from "@/components/admin/TeamForms";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/auth/guard";
import { adminGroups, adminTeams, adminTournament } from "@/lib/queries/admin";

type Props = { params: Promise<{ slug: string }> };

export default async function AdminTeamsPage({ params }: Props) {
  await requireAdmin();

  const { slug } = await params;
  const tournament = await adminTournament(slug);
  if (!tournament) notFound();

  const [teams, groups] = await Promise.all([
    adminTeams(tournament.id),
    adminGroups(tournament.id),
  ]);

  return (
    <AdminShell
      title="Команды"
      subtitle={tournament.name}
      tabs={tournamentTabs(slug)}
      activeHref={`/admin/t/${slug}/teams`}
      publicHref={`/t/${slug}/teams`}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader title="Список" hint={`Команд: ${teams.length}`} />
          <div className="p-5">
            {teams.length === 0 ? (
              <EmptyState title="Команд ещё нет" hint="Добавьте первую справа." />
            ) : (
              <ul className="space-y-2">
                {teams.map((team) => (
                  <li
                    key={team.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-edge bg-surface-sunken/60 p-3"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/admin/t/${slug}/teams/${team.id}`}
                        className="truncate font-medium hover:text-accent"
                      >
                        {team.name}
                      </Link>
                      <p className="text-xs text-ink-faint">
                        {team.seed ? `посев ${team.seed} · ` : ""}
                        {team.slug}
                      </p>
                    </div>

                    <GroupPicker
                      tournamentId={tournament.id}
                      teamId={team.id}
                      groups={groups}
                      currentGroupId={team.group_id}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Новая команда" />
          <div className="p-5">
            <TeamForm tournamentId={tournament.id} groups={groups} />
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
