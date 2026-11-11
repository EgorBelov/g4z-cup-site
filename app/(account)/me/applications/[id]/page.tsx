import { notFound } from "next/navigation";
import { ApplicationPanel } from "@/components/player/ApplicationPanel";
import { applicationDetail } from "@/lib/queries/registration";
export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const data = await applicationDetail(id);
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="page-title mb-6">Заявка команды</h1>
      <ApplicationPanel data={data} />
    </div>
  );
}
