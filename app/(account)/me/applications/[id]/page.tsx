import { notFound } from "next/navigation";
import { ApplicationPanel } from "@/components/player/ApplicationPanel";
import { ButtonLink } from "@/components/ui/Button";
import { applicationDetail } from "@/lib/queries/registration";
import { applicationLabels } from "@/lib/types/registration";

export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const data = await applicationDetail(id);
  const { application, team, tournament } = data;

  return (
    <div>
      <div className="orbit-page-head">
        <div>
          <h1 className="orbit-page-title">Заявка команды</h1>
          <p className="orbit-page-sub">
            {tournament.name} · {team.name} · {applicationLabels[application.status]}
          </p>
        </div>
        <ButtonLink href={`/teams/${team.slug}`} variant="secondary">
          Страница команды ↗
        </ButtonLink>
      </div>

      <ApplicationPanel data={data} />
    </div>
  );
}
