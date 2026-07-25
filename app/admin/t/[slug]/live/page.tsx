import { notFound } from "next/navigation";
import { AdminShell, tournamentTabs } from "@/components/admin/AdminShell";
import { LiveMatchCard, StartMatchCard } from "@/components/admin/LiveConsole";
import { LiveRefresher } from "@/components/live/LiveRefresher";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/auth/guard";
import { adminLiveBoard, adminTournament } from "@/lib/queries/admin";

type Props = { params: Promise<{ slug: string }> };

export default async function AdminLivePage({ params }: Props) {
  await requireAdmin();

  const { slug } = await params;
  const tournament = await adminTournament(slug);
  if (!tournament) notFound();

  const { live, next } = await adminLiveBoard(tournament.id);

  return (
    <AdminShell
      title="Ведение матча"
      subtitle="Один тап на карту. Счёт, победитель серии и сетка обновятся сами"
      tabs={tournamentTabs(slug)}
      activeHref={`/admin/t/${slug}/live`}
      publicHref={`/t/${slug}`}
    >
      <LiveRefresher tournamentId={tournament.id} pollSeconds={30} />

      {live.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {live.map((match) => (
            <LiveMatchCard
              key={match.id}
              match={match}
              timeZone={tournament.time_zone}
              adminHref={`/admin/t/${slug}/matches/${match.id}`}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Сейчас никто не играет"
          hint="Нажмите «Начать» у ближайшего матча — он попадёт сюда и на главную страницу сайта."
        />
      )}

      <Card className="mt-6">
        <CardHeader title="Ближайшие матчи" hint={`В очереди: ${next.length}`} />
        <div className="space-y-3 p-5">
          {next.length > 0 ? (
            next.map((match) => (
              <StartMatchCard
                key={match.id}
                match={match}
                timeZone={tournament.time_zone}
                adminHref={`/admin/t/${slug}/matches/${match.id}`}
              />
            ))
          ) : (
            <EmptyState title="Расписание пусто" />
          )}
        </div>
      </Card>
    </AdminShell>
  );
}
