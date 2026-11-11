import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { Container, Skeleton } from "@/components/ui/PageHeader";
import { CommandForm } from "@/components/player/TeamForms";
import { getTournament } from "@/lib/queries/public";
import { currentPlayer, playerTeams, playerApplications } from "@/lib/queries/player";
import { writeClient } from "@/lib/supabase/write";
import { applicationLabels } from "@/lib/types/registration";
export default function TournamentRegisterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Container className="py-8 sm:py-12">
      <Suspense fallback={<Skeleton className="h-64" />}>
        <Participation params={params} />
      </Suspense>
    </Container>
  );
}
async function Participation({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTournament(slug);
  if (!t) notFound();
  const player = await currentPlayer();
  const next = `/t/${slug}/register`;
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="eyebrow">
          {t.game} · {t.registration_open ? "Приём открыт" : "Приём закрыт"}
        </p>
        <h1 className="page-title mt-3">{t.name}</h1>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-muted">
          Капитан создаёт команду, собирает {t.roster_size} основных игроков и до{" "}
          {t.max_substitutes} запасных, затем подаёт командную заявку. Участие
          подтверждает организатор. Рейтинг не обязателен.
        </p>
      </div>
      {!player ? (
        <Card className="p-5 sm:p-7">
          <h2 className="text-2xl">Начните с аккаунта</h2>
          <p className="mt-4 text-sm text-ink-muted">
            Аккаунт нужен каждому игроку. Это ещё не заявка на турнир. Сначала
            зарегистрируйтесь, затем создайте команду или примите приглашение капитана.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href={`/register?next=${encodeURIComponent(next)}`}>
              Создать аккаунт
            </ButtonLink>
            <ButtonLink
              href={`/login?next=${encodeURIComponent(next)}`}
              variant="secondary"
            >
              Уже есть аккаунт · войти
            </ButtonLink>
          </div>
        </Card>
      ) : (
        <PlayerParticipation
          playerId={player.id}
          tournamentId={t.id}
          open={t.registration_open && t.status !== "finished"}
        />
      )}
    </div>
  );
}
async function PlayerParticipation({
  playerId,
  tournamentId,
  open,
}: {
  playerId: string;
  tournamentId: number;
  open: boolean;
}) {
  const teams = await playerTeams(playerId);
  const applications = (await playerApplications(playerId, teams)).filter(
    (a) => a.tournament_id === tournamentId,
  );
  const interest = await writeClient()
    .from("participation_interests")
    .select("active")
    .eq("profile_id", playerId)
    .eq("tournament_id", tournamentId)
    .maybeSingle();
  if (interest.error) throw new Error("Не удалось проверить пожелание об участии");
  return (
    <>
      <Card className="p-5 sm:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl">Командная заявка</h2>
          <ButtonLink href="/me/teams/new" size="sm">
            Создать команду
          </ButtonLink>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {teams
            .filter((c) => !c.archived)
            .map((c) => {
              const app = applications.find((a) => a.community_team_id === c.id);
              return (
                <div
                  key={c.id}
                  className="rounded-control border border-edge bg-panel p-5"
                >
                  <p className="mb-4 font-medium">{c.name}</p>
                  {app && app.status !== "withdrawn" ? (
                    <ButtonLink
                      href={`/me/applications/${app.id}`}
                      size="sm"
                      variant="secondary"
                    >
                      {applicationLabels[app.status]} · открыть
                    </ButtonLink>
                  ) : open ? (
                    <CommandForm
                      label="Создать заявку команды"
                      variant="primary"
                      fields={{
                        action: "application_create",
                        team_id: c.id,
                        tournament_id: tournamentId,
                      }}
                    />
                  ) : (
                    <p className="text-sm text-ink-muted">Приём закрыт</p>
                  )}
                </div>
              );
            })}
        </div>
        {!teams.length ? (
          <p className="text-sm text-ink-muted">
            Вы пока не капитан команды. Создайте её или вступите в состав по
            приглашению.
          </p>
        ) : null}
        {applications
          .filter((a) => !teams.some((c) => c.id === a.community_team_id))
          .map((a) => (
            <ButtonLink
              key={a.id}
              href={`/me/applications/${a.id}`}
              className="mt-4"
              variant="secondary"
            >
              Мой состав · {applicationLabels[a.status]}
            </ButtonLink>
          ))}
      </Card>
      <Card className="p-5 sm:p-7">
        <h2 className="text-2xl">Пока без команды?</h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-muted">
          Можно оставить пожелание «Хочу участвовать». Его увидит организатор и сможет
          помочь найти состав. Это не турнирная заявка и не автоматическое зачисление в
          команду.
        </p>
        {open || interest.data?.active ? (
          <CommandForm
            className="mt-5"
            label={interest.data?.active ? "Убрать пожелание" : "Хочу участвовать"}
            fields={{
              action: "interest",
              tournament_id: tournamentId,
              active: !interest.data?.active,
            }}
          />
        ) : (
          <p className="mt-5 text-sm text-ink-muted">Приём пожеланий закрыт</p>
        )}
      </Card>
    </>
  );
}
