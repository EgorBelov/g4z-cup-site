import { ProfileForm } from "@/components/player/AccountForms";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { requirePlayer } from "@/lib/queries/player";
export default async function ProfilePage() {
  const player = await requirePlayer();
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="page-title">Мой профиль</h1>
        <ButtonLink href="/me" size="sm" variant="secondary">
          В кабинет
        </ButtonLink>
      </div>
      <Card className="p-5 sm:p-7">
        <p className="mb-6 text-sm text-ink-muted">
          P{player.code} ·{" "}
          {player.telegram_contact_verified
            ? "Telegram-контакт совпадает с подтверждённым входом"
            : "Контакт указан вручную"}
        </p>
        <ProfileForm values={player} editing />
      </Card>
    </div>
  );
}
