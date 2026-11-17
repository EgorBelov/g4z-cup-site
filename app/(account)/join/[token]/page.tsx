import { AccountPageBoundary } from "@/components/player/AccountPageBoundary";
import { createHash } from "node:crypto";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CommandForm } from "@/components/player/TeamForms";
import { currentPlayer, isTeamMember, teamInviteByToken } from "@/lib/queries/player";

/**
 * Ссылка-приглашение в постоянный состав команды.
 *
 * Отличие от `/invite/<token>`: та ссылка вступает в турнирную заявку и живёт
 * до конца приёма, а эта — в саму команду. Турнирный состав капитан собирает
 * уже из участников команды на странице заявки.
 */
type JoinTeamPageProps = {
  params: Promise<{ token: string }>;
};

export default function JoinTeamPage(props: JoinTeamPageProps) {
  return (
    <AccountPageBoundary>
      <JoinTeamPageContent {...props} />
    </AccountPageBoundary>
  );
}

async function JoinTeamPageContent({ params }: JoinTeamPageProps) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) notFound();

  const preview = await teamInviteByToken(
    createHash("sha256").update(token).digest("hex"),
  );
  if (!preview) notFound();

  const player = await currentPlayer();
  const member = player ? await isTeamMember(preview.team.id, player.id) : false;
  const captain = Boolean(
    player &&
    (preview.team.main_captain === player.id ||
      preview.team.second_captain === player.id),
  );
  const available =
    preview.invite.status === "active" && !preview.expired && !preview.team.archived;
  const next = `/join/${token}`;

  return (
    <Card className="mx-auto max-w-2xl p-6 sm:p-9">
      <p className="eyebrow">Приглашение в команду</p>
      <h1 className="page-title mt-3">{preview.team.name}</h1>
      <p className="mt-4 text-sm text-ink-muted">
        Это постоянный состав команды, а не заявка на турнир. На каждый кубок капитан
        собирает отдельную турнирную заявку из участников команды.
      </p>

      {!available ? (
        <p
          role="status"
          className="mt-6 rounded-control border border-edge bg-panel p-4 text-sm"
        >
          Ссылка истекла, отозвана или команда закрыта. Попросите капитана новую.
        </p>
      ) : member || captain ? (
        <p
          role="status"
          className="mt-6 rounded-control border border-accent/40 bg-accent-soft p-4 text-sm"
        >
          {captain
            ? "Вы капитан этой команды — вступать не нужно."
            : "Вы уже в составе этой команды."}
        </p>
      ) : player ? (
        <CommandForm
          className="mt-6"
          label="Вступить в команду"
          variant="primary"
          fields={{ action: "community_link_accept", token }}
        />
      ) : (
        <>
          <p className="mt-6 text-sm text-ink-muted">
            Чтобы вступить, нужен аккаунт игрока — он подтверждается через Telegram.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
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
        </>
      )}

      <div className="mt-6">
        <ButtonLink href={`/teams/${preview.team.slug}`} variant="ghost" size="sm">
          Страница команды ↗
        </ButtonLink>
      </div>
    </Card>
  );
}
