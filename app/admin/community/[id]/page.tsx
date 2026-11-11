import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import {
  PlayerSearch,
  CommandForm,
  CommunityTeamForm,
} from "@/components/player/TeamForms";
import type { CommunityTeam } from "@/lib/types/registration";
import { requireAdmin } from "@/lib/auth/guard";
import { writeClient } from "@/lib/supabase/write";
import { getPublicCommunityTeam } from "@/lib/queries/public";
export default async function OrganizerCommunityTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const { data: team, error } = await writeClient()
    .from("community_teams")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Не удалось загрузить команду");
  if (!team) notFound();
  const publicTeam = await getPublicCommunityTeam(team.slug as string);
  return (
    <AdminShell
      title={team.name as string}
      subtitle="Постоянная команда сообщества"
      actions={
        <ButtonLink href={`/teams/${team.slug}`} variant="secondary" size="sm">
          Публичная страница
        </ButtonLink>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2">
        {!team.archived ? (
          <Card className="p-5">
            <h2 className="mb-5 text-2xl">Данные команды</h2>
            <CommunityTeamForm admin team={team as CommunityTeam} />
          </Card>
        ) : null}
        <Card className="p-5">
          <h2 className="text-2xl">Капитаны</h2>
          <p className="mt-5 text-sm">
            Главный: {publicTeam?.main_captain.nickname ?? "—"}
          </p>
          <p className="mt-3 text-sm">
            Второй: {publicTeam?.second_captain?.nickname ?? "Не назначен"}
          </p>
          <div className="mt-5">
            <PlayerSearch
              teamId={id}
              teamVersion={team.version as number}
              admin
              roles
            />
          </div>
          {team.second_captain ? (
            <CommandForm
              admin
              className="mt-5"
              label="Снять второго капитана"
              fields={{
                action: "second_remove",
                team_id: id,
                team_version: team.version as number,
              }}
            />
          ) : null}
        </Card>
        <Card className="p-5">
          <h2 className="text-2xl">
            {team.archived ? "Команда закрыта" : "Команда активна"}
          </h2>
          <p className="my-5 text-sm text-ink-muted">
            Изменения организатора прямые, без подтверждения капитанов. История участий
            сохраняется.
          </p>
          <CommandForm
            admin
            label={team.archived ? "Восстановить команду" : "Закрыть команду"}
            fields={{
              action: team.archived ? "team_restore" : "team_archive",
              team_id: id,
              team_version: team.version as number,
            }}
          />
        </Card>
      </div>
    </AdminShell>
  );
}
