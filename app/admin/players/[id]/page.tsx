import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AssignPlayer } from "@/components/admin/AssignPlayer";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/auth/guard";
import { organizerProfile, organizerApplications } from "@/lib/queries/organizer";
import { adminTournaments } from "@/lib/queries/admin";
export default async function OrganizerPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) notFound();
  const result = await organizerProfile(id);
  if (!result) notFound();
  const p = result.profile;
  const [{ applications, teams }, tournaments] = await Promise.all([
    organizerApplications(),
    adminTournaments(),
  ]);
  const targets = applications
    .filter(
      (a) =>
        a.status !== "withdrawn" &&
        tournaments.some((t) => t.id === a.tournament_id && t.status !== "finished"),
    )
    .map((a) => ({
      id: a.id,
      version: a.version,
      label: `${tournaments.find((t) => t.id === a.tournament_id)?.name} · ${teams.find((c) => c.id === a.community_team_id)?.name}`,
    }));
  return (
    <AdminShell
      title={p.nickname}
      subtitle={`Аккаунт P${p.code}`}
      actions={
        <ButtonLink href="/admin/players" variant="secondary" size="sm">
          Все игроки
        </ButtonLink>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5 sm:p-7">
          <h2 className="text-2xl">Профиль и контакты</h2>
          <dl className="mt-5 space-y-4">
            {[
              {
                label: "Telegram",
                value: `@${p.telegram_username}`,
                href: `https://t.me/${p.telegram_username}`,
              },
              { label: "Steam", value: p.steam_url, href: p.steam_url },
              { label: "Faceit", value: p.faceit_url, href: p.faceit_url },
              { label: "Dotabuff", value: p.dotabuff_url, href: p.dotabuff_url },
            ]
              .filter((s) => s.value)
              .map((s) => (
                <div key={s.label}>
                  <dt className="text-xs text-ink-muted">{s.label}</dt>
                  <dd className="mt-2 break-all text-sm">
                    <a
                      href={s.href ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent underline"
                    >
                      {s.value}
                    </a>
                  </dd>
                </div>
              ))}
          </dl>
          <p className="mt-5 text-sm text-ink-muted">
            Контакт{" "}
            {p.telegram_contact_verified
              ? "совпадает с подтверждённым Telegram"
              : "введён вручную"}
            . Внешние аккаунты не подтверждены автоматически.
          </p>
          {result.duplicateSteam ? (
            <p className="mt-5 rounded-control border border-warn/40 bg-warn-soft p-4 text-sm text-warn">
              Эта нормализованная Steam-ссылка указана и у другого профиля. Нужна ручная
              проверка; автоматического запрета нет.
            </p>
          ) : null}
          <div className="mt-5 flex gap-3 text-sm">
            <span>Dota 2: {p.dota_mmr ?? "—"} MMR</span>
            <span>CS2: {p.cs_elo ?? "—"} Elo</span>
          </div>
        </Card>
        <Card className="p-5 sm:p-7">
          <h2 className="mb-5 text-2xl">Добавить в состав</h2>
          <AssignPlayer profileId={p.id} targets={targets} />
        </Card>
      </div>
    </AdminShell>
  );
}
