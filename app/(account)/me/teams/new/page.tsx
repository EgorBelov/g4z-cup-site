import { CommunityTeamForm } from "@/components/player/TeamForms";
import { Card } from "@/components/ui/Card";
import { requirePlayer } from "@/lib/queries/player";
export default async function NewCommunityTeamPage() {
  await requirePlayer();
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="page-title mb-6">Собрать своих</h1>
      <Card className="p-5 sm:p-7">
        <p className="mb-6 text-sm text-ink-muted">
          Вы станете главным капитаном. Затем выберите турнир и пригласите игроков в
          состав.
        </p>
        <CommunityTeamForm />
      </Card>
    </div>
  );
}
