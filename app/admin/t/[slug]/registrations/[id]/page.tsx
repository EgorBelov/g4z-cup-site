import { notFound } from "next/navigation";
import { AdminShell, tournamentTabs } from "@/components/admin/AdminShell";
import { ApplicationPanel } from "@/components/player/ApplicationPanel";
import { ButtonLink } from "@/components/ui/Button";
import { requireAdmin } from "@/lib/auth/guard";
import { applicationDetail } from "@/lib/queries/registration";
export default async function ReviewRegistrationPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  await requireAdmin();
  const { slug, id: raw } = await params;
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const data = await applicationDetail(id, true);
  if (data.tournament.slug !== slug) notFound();
  return (
    <AdminShell
      title="Заявка команды"
      subtitle={data.tournament.name}
      tabs={tournamentTabs(slug)}
      activeHref={`/admin/t/${slug}/registrations`}
      publicHref={`/t/${slug}`}
      actions={
        <ButtonLink
          href={`/admin/community/${data.team.id}`}
          variant="secondary"
          size="sm"
        >
          Капитаны и команда
        </ButtonLink>
      }
    >
      <ApplicationPanel data={data} admin />
    </AdminShell>
  );
}
