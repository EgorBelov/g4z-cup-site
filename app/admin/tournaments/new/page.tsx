import { AdminShell } from "@/components/admin/AdminShell";
import { TournamentForm } from "@/components/admin/TournamentForm";
import { Card, CardHeader } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/auth/guard";

export default async function NewTournamentPage() {
  await requireAdmin();

  return (
    <AdminShell
      title="Новый турнир"
      subtitle="Создаётся как черновик — на сайте пока не виден"
    >
      <Card>
        <CardHeader
          title="Параметры турнира"
          hint="Название, адрес страницы и даты можно поменять в любой момент"
        />
        <div className="p-5">
          <TournamentForm />
        </div>
      </Card>
    </AdminShell>
  );
}
