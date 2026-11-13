import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { Container, Skeleton } from "@/components/ui/PageHeader";
import { CommandForm } from "@/components/player/TeamForms";
import { getTournament } from "@/lib/queries/public";
import { currentPlayer, playerTeams, playerApplications } from "@/lib/queries/player";
import { writeClient } from "@/lib/supabase/write";
import { applicationLabels } from "@/lib/types/registration";

function teamMark(name: string): string {
  return name
    .replace(/^Team\s+/i, "")
    .slice(0, 2)
    .toUpperCase();
}

export default function TournamentRegisterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Container className="orbit-register">
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
  const open = t.registration_open && t.status !== "finished";

  return (
    <>
      <div className="orbit-page-head">
        <div>
          <h1 className="orbit-page-title">Заявка на турнир</h1>
          <p className="orbit-page-sub">
            {t.name} · {open ? "приём заявок открыт" : "приём заявок закрыт"}
          </p>
        </div>
        <span className="orbit-groups-window">
          {open ? "до жеребьёвки" : "приём закрыт"}
        </span>
      </div>

      <div className="orbit-register-grid">
        <div className="orbit-register-main">
          {!player ? (
            <>
              <section className="orbit-register-card orbit-frame">
                <div className="orbit-register-card-head">
                  <h2>Начните с аккаунта</h2>
                </div>
                <p className="orbit-register-note" style={{ marginTop: 16 }}>
                  Аккаунт нужен каждому игроку — это ещё не заявка на турнир. Войдите
                  через Telegram, потом создайте команду или примите приглашение
                  капитана.
                </p>
                <div className="orbit-register-actions">
                  <ButtonLink
                    href={`/register?next=${encodeURIComponent(next)}`}
                    variant="live"
                  >
                    Создать аккаунт ↗
                  </ButtonLink>
                  <ButtonLink
                    href={`/login?next=${encodeURIComponent(next)}`}
                    variant="secondary"
                  >
                    Уже есть аккаунт · войти
                  </ButtonLink>
                </div>
              </section>

              <section className="orbit-register-card orbit-frame">
                <div className="orbit-register-card-head">
                  <h2>Что дальше</h2>
                </div>
                <p className="orbit-register-note" style={{ marginTop: 16 }}>
                  Капитан собирает {t.roster_size} основных игроков и до{" "}
                  {t.max_substitutes} запасных, затем подаёт командную заявку. Участие
                  подтверждает организатор — после этого команда попадает в жеребьёвку.
                </p>
              </section>
            </>
          ) : (
            <PlayerParticipation
              playerId={player.id}
              tournamentId={t.id}
              open={open}
            />
          )}
        </div>

        <aside className="orbit-register-aside">
          <section className="orbit-register-steps orbit-frame">
            <h2>Как это работает</h2>
            <div className="orbit-register-step">
              <span className="n">01</span>
              <div>
                <b>Аккаунт</b>
                <span>Один на игрока, вход через Telegram</span>
              </div>
            </div>
            <div className="orbit-register-step">
              <span className="n">02</span>
              <div>
                <b>Состав</b>
                <span>
                  {t.roster_size} основных и до {t.max_substitutes} запасных, капитан
                  подаёт заявку
                </span>
              </div>
            </div>
            <div className="orbit-register-step">
              <span className="n">03</span>
              <div>
                <b>Подтверждение</b>
                <span>Организатор проверяет состав и допускает в сетку</span>
              </div>
            </div>
          </section>

          <dl className="orbit-register-facts orbit-frame">
            <div>
              <dt>Состав</dt>
              <dd>
                {t.roster_size} + {t.max_substitutes} запасных
              </dd>
            </div>
            <div>
              <dt>Дисциплина</dt>
              <dd>{t.game}</dd>
            </div>
            <div>
              <dt>Рейтинг</dt>
              <dd>не обязателен</dd>
            </div>
            <div>
              <dt>Приём</dt>
              <dd>{open ? "открыт" : "закрыт"}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </>
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

  const activeTeams = teams.filter((team) => !team.archived);
  const orphans = applications.filter(
    (a) => !teams.some((team) => team.id === a.community_team_id),
  );

  return (
    <>
      <section className="orbit-register-card orbit-frame">
        <div className="orbit-register-card-head">
          <h2>Мои составы</h2>
          <ButtonLink href="/me/teams/new" size="sm" variant="secondary">
            Создать команду
          </ButtonLink>
        </div>

        {activeTeams.length === 0 && orphans.length === 0 ? (
          <p className="orbit-register-note orbit-register-empty">
            Вы пока не капитан команды. Создайте её или вступите в состав по приглашению
            капитана.
          </p>
        ) : null}

        {activeTeams.map((team) => {
          const app = applications.find((a) => a.community_team_id === team.id);
          const applied = app && app.status !== "withdrawn";

          return (
            <div className="orbit-register-team" key={team.id}>
              <span className="orbit-register-mark" aria-hidden="true">
                {teamMark(team.name)}
              </span>
              <div className="orbit-register-name">
                <b>{team.name}</b>
                <span>{applied ? "заявка подана" : "команда капитана"}</span>
              </div>
              <div className="orbit-register-side">
                {applied ? (
                  <>
                    <span className="orbit-register-state">
                      {applicationLabels[app.status]}
                    </span>
                    <ButtonLink
                      href={`/me/applications/${app.id}`}
                      size="sm"
                      variant="secondary"
                    >
                      Открыть
                    </ButtonLink>
                  </>
                ) : open ? (
                  <div className="orbit-register-action">
                    <CommandForm
                      label="Подать заявку"
                      variant="primary"
                      fields={{
                        action: "application_create",
                        team_id: team.id,
                        tournament_id: tournamentId,
                      }}
                    />
                  </div>
                ) : (
                  <span className="orbit-register-state">приём закрыт</span>
                )}
              </div>
            </div>
          );
        })}

        {orphans.map((app) => (
          <div className="orbit-register-team" key={app.id}>
            <span className="orbit-register-mark" aria-hidden="true">
              ?
            </span>
            <div className="orbit-register-name">
              <b>Заявка без команды</b>
              <span>{applicationLabels[app.status]}</span>
            </div>
            <div className="orbit-register-action">
              <ButtonLink
                href={`/me/applications/${app.id}`}
                size="sm"
                variant="secondary"
              >
                Открыть
              </ButtonLink>
            </div>
          </div>
        ))}
      </section>

      <section className="orbit-register-card orbit-frame">
        <div className="orbit-register-card-head">
          <h2>Пока без команды?</h2>
        </div>
        <p className="orbit-register-note" style={{ marginTop: 16 }}>
          Отметьтесь, если ищете команду: организатор увидит это и поможет собрать состав.
          На турнир это не заявляет — заявку подаёт капитан.
        </p>
        <div className="orbit-register-actions">
          {open || interest.data?.active ? (
            <div className="orbit-register-action">
              <CommandForm
                label={interest.data?.active ? "Убрать отметку" : "Ищу команду"}
                variant="primary"
                fields={{
                  action: "interest",
                  tournament_id: tournamentId,
                  active: !interest.data?.active,
                }}
              />
            </div>
          ) : (
            <span className="orbit-register-state">приём пожеланий закрыт</span>
          )}
          <ButtonLink href="/me/teams/new" variant="secondary">
            Создать команду ↗
          </ButtonLink>
        </div>
        <p className="orbit-register-note" style={{ marginTop: 14 }}>
          Заявку на турнир подаёт капитан — кнопкой «Подать заявку» в блоке «Мои составы».
          Состав: {rosterSize} + до {maxSubstitutes} запасных.
        </p>
      </section>

    </>
  );
}
