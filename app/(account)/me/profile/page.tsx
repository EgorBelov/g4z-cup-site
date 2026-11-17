import { AccountPageBoundary } from "@/components/player/AccountPageBoundary";
import { ProfileForm } from "@/components/player/AccountForms";
import { DiscordUnlinkForm } from "@/components/player/DiscordForms";
import { ButtonLink } from "@/components/ui/Button";
import { discordConfigured } from "@/lib/discord/config";
import { requirePlayer } from "@/lib/queries/player";

const notices: Record<string, { tone: "ok" | "error"; text: string }> = {
  linked: { tone: "ok", text: "Discord привязан. Роли и канал обновятся сами" },
  unlinked: { tone: "ok", text: "Discord отвязан, выданные роли сняты" },
  taken: { tone: "error", text: "Этот Discord уже привязан к другому аккаунту" },
  denied: { tone: "error", text: "Вы отменили доступ в Discord" },
  state: { tone: "error", text: "Ссылка привязки устарела — начните заново" },
  session: { tone: "error", text: "Сессия истекла. Войдите и повторите привязку" },
  off: { tone: "error", text: "Discord ещё не настроен на сервере" },
  origin: { tone: "error", text: "Откройте кабинет на основном адресе сайта" },
  error: { tone: "error", text: "Не удалось привязать Discord, попробуйте позже" },
};

type ProfilePageProps = {
  searchParams: Promise<{ discord?: string }>;
};

export default function ProfilePage(props: ProfilePageProps) {
  return (
    <AccountPageBoundary>
      <ProfilePageContent {...props} />
    </AccountPageBoundary>
  );
}

async function ProfilePageContent({ searchParams }: ProfilePageProps) {
  const player = await requirePlayer();
  const verified = player.telegram_contact_verified;
  const configured = discordConfigured();
  const notice = notices[(await searchParams).discord ?? ""];

  return (
    <div className="orbit-profile-page">
      <div className="orbit-page-head">
        <div>
          <h1 className="orbit-page-title">Мой профиль</h1>
          <p className="orbit-page-sub">
            {verified ? "telegram-контакт подтверждён" : "контакт указан вручную"}
          </p>
        </div>
        <ButtonLink href="/me" size="sm" variant="secondary">
          В кабинет
        </ButtonLink>
      </div>

      {notice ? (
        <div
          role="status"
          className={
            notice.tone === "ok"
              ? "mb-5 rounded-control border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent"
              : "mb-5 rounded-control border border-live/40 bg-live-soft px-4 py-3 text-sm text-live"
          }
        >
          {notice.text}
        </div>
      ) : null}

      <div className="orbit-profile-grid">
        <div className="orbit-profile-main">
          <section className="orbit-profile-card orbit-frame">
            <div className="orbit-profile-card-head">
              <h2>Профиль игрока</h2>
              <span>{verified ? "вход подтверждён" : "контакт вручную"}</span>
            </div>
            <div className="orbit-form-scope">
              <ProfileForm values={player} editing />
            </div>
          </section>
        </div>

        <aside className="orbit-profile-aside">
          <section className="orbit-profile-card orbit-frame">
            <div className="orbit-profile-card-head">
              <h2>Discord</h2>
              <span>
                {player.discord_id
                  ? player.discord_in_guild
                    ? "на сервере"
                    : "не на сервере"
                  : "не привязан"}
              </span>
            </div>
            <div className="orbit-profile-vis">
              <div>
                <span
                  className="dot"
                  data-open={player.discord_id ? "true" : "false"}
                  aria-hidden="true"
                />
                <div>
                  <b>{player.discord_username ?? "Не привязан"}</b>
                  <span>
                    {player.discord_id
                      ? "роль команды и «Капитан» выдаются автоматически"
                      : "нужен для голосового канала команды"}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-start gap-3">
              {!configured ? (
                <p className="text-xs text-ink-muted">
                  Discord ещё не настроен на сервере.
                </p>
              ) : player.discord_id ? (
                <>
                  {!player.discord_in_guild ? (
                    <ButtonLink
                      href="/auth/discord/start?next=/me/profile"
                      size="sm"
                      variant="secondary"
                    >
                      Добавить себя на сервер
                    </ButtonLink>
                  ) : null}
                  <DiscordUnlinkForm />
                </>
              ) : (
                <ButtonLink href="/auth/discord/start?next=/me/profile" size="sm">
                  Привязать Discord
                </ButtonLink>
              )}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-ink-muted">
              Discord не обязателен: сайт, заявки и состав работают без него. Но войс
              команды доступен только привязанным игрокам.
            </p>
          </section>

          <section className="orbit-profile-card orbit-frame">
            <div className="orbit-profile-card-head">
              <h2>Что видят другие</h2>
            </div>
            <div className="orbit-profile-vis">
              <div>
                <span className="dot" aria-hidden="true" />
                <div>
                  <b>Ник и рейтинги</b>
                  <span>в составе команды и поиске капитанов</span>
                </div>
              </div>
              <div>
                <span className="dot" data-open="false" aria-hidden="true" />
                <div>
                  <b>Telegram</b>
                  <span>только вы и организаторы</span>
                </div>
              </div>
              <div>
                <span className="dot" data-open="false" aria-hidden="true" />
                <div>
                  <b>Steam, Faceit, Dotabuff</b>
                  <span>только вы и организаторы</span>
                </div>
              </div>
              <div>
                <span className="dot" data-open="false" aria-hidden="true" />
                <div>
                  <b>Ссылка на профиль</b>
                  <span>не подтверждает владение игрой</span>
                </div>
              </div>
            </div>
          </section>

          <section className="orbit-profile-card orbit-frame">
            <div className="orbit-profile-card-head">
              <h2>Аккаунт</h2>
            </div>
            <div className="orbit-profile-vis">
              <div>
                <span className="dot" aria-hidden="true" />
                <div>
                  <b>
                    {player.login_nickname ? "Вход по паролю" : "Вход через Telegram"}
                  </b>
                  <span>
                    {player.login_nickname
                      ? `Логин: ${player.login_nickname}. Telegram указан для связи`
                      : verified
                        ? "контакт совпадает с подтверждённым"
                        : "контакт указан вручную"}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
