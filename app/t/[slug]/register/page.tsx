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
      <section className="orbit-reg-hero orbit-frame orbit-rise">
        <p className="label">{open ? "приём заявок открыт" : "приём заявок закрыт"}</p>
        <h1>Заявка на турнир</h1>
        <p className="meta">
          <span>{t.name}</span>
          <span>{t.game}</span>
          <span>
            {t.roster_size} + до {t.max_substitutes} запасных
          </span>
        </p>

        {!player ? (
          <div className="actions">
            <ButtonLink href={`/register?next=${encodeURIComponent(next)}`} variant="live">
              Создать аккаунт ↗
            </ButtonLink>
            <ButtonLink
              href={`/login?next=${encodeURIComponent(next)}`}
              variant="secondary"
            >
              Уже есть аккаунт · войти
            </ButtonLink>
          </div>
        ) : null}

        {t.edition ? (
          <span className="num" aria-hidden="true">
            {t.edition}
          </span>
        ) : null}
      </section>

      <div className="orbit-reg-steps">
        <div className="orbit-reg-step orbit-frame orbit-rise">
          <span className="n">01</span>
          <b>Аккаунт</b>
          <span>Вход через Telegram, контакт подтверждается сам.</span>
        </div>
        <div className="orbit-reg-step orbit-frame orbit-rise">
          <span className="n">02</span>
          <b>Состав</b>
          <span>
            {t.roster_size} основных и до {t.max_substitutes} запасных — собирает капитан.
          </span>
        </div>
        <div className="orbit-reg-step orbit-frame orbit-rise">
          <span className="n">03</span>
          <b>Подтверждение</b>
          <span>Организатор проверяет состав и допускает в сетку.</span>
        </div>
      </div>

      <div className="orbit-reg-grid">
        <div className="orbit-reg-main orbit-rise">
          {!player ? (
            <section className="orbit-register-card orbit-frame">
              <div className="orbit-register-card-head">
                <h2>Что нужно для заявки</h2>
              </div>
              <ul className="orbit-reg-check">
                <li>Аккаунт с ником и контактами.</li>
                <li>
                  Команда из {t.roster_size} игроков, запасные по желанию.
                </li>
                <li>Заявку подаёт капитан — остальным ничего заполнять не нужно.</li>
              </ul>
            </section>
          ) : (
            <PlayerParticipation
              playerId={player.id}
              tournamentId={t.id}
              open={open}
              rosterSize={t.roster_size}
              maxSubstitutes={t.max_substitutes}
            />
          )}
        </div>

        <aside className="orbit-register-aside orbit-rise">
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
  rosterSize,
  maxSubstitutes,
}: {
  playerId: string;
  tournamentId: number;
  open: boolean;
  rosterSize: number;
  maxSubstitutes: number;
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
          Пожелание «Хочу участвовать» видит организатор — он поможет собрать состав.
        </p>
        <div className="orbit-register-actions">
          {open || interest.data?.active ? (
            <div className="orbit-register-action">
              <CommandForm
                label={interest.data?.active ? "Убрать пожелание" : "Хочу участвовать"}
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
          Состав: {rosterSize} + до {maxSubstitutes} запасных.
        </p>
      </section>
    </>
  );
}
