import { createHash } from "node:crypto";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { CommandForm } from "@/components/player/TeamForms";
import { invitePreview, currentPlayer } from "@/lib/queries/player";
import { getTournament } from "@/lib/queries/public";
import { writeClient } from "@/lib/supabase/write";
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) notFound();
  const preview = await invitePreview(createHash("sha256").update(token).digest("hex"));
  if (!preview) notFound();
  const player = await currentPlayer();
  const cup = await writeClient()
    .from("tournaments")
    .select("slug")
    .eq("id", preview.application.tournament_id)
    .single();
  const t = cup.data ? await getTournament(cup.data.slug as string) : null;
  if (!t) notFound();
  const available =
    preview.invite.status === "active" &&
    !preview.expired &&
    !preview.team.archived &&
    t.registration_open &&
    t.status !== "finished" &&
    !["accepted", "withdrawn"].includes(preview.application.status);
  const next = `/invite/${token}`;
  return (
    <Card className="mx-auto max-w-2xl p-6 sm:p-9">
      <p className="eyebrow">Приглашение в состав</p>
      <h1 className="page-title mt-3">{preview.team.name}</h1>
      <p className="mt-5 text-lg">
        {t.name} · {t.game}
      </p>
      <p className="mt-4 text-sm text-ink-muted">
        Подтверждение займёт свободный слот. В этом кубке можно играть только за одну
        команду, включая запасных.
      </p>
      {!available ? (
        <p
          role="status"
          className="mt-6 rounded-control border border-edge bg-panel p-4 text-sm"
        >
          Приглашение истекло, отозвано или состав заблокирован. Обратитесь к капитану.
        </p>
      ) : player ? (
        <CommandForm
          className="mt-6"
          label="Принять приглашение"
          variant="primary"
          fields={{ action: "invite_accept", token }}
        />
      ) : (
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href={`/register?next=${encodeURIComponent(next)}`}>
            Создать аккаунт и вернуться
          </ButtonLink>
          <ButtonLink
            href={`/login?next=${encodeURIComponent(next)}`}
            variant="secondary"
          >
            Войти и вернуться
          </ButtonLink>
        </div>
      )}
    </Card>
  );
}
