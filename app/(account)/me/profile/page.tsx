import { ProfileForm } from "@/components/player/AccountForms";
import { ButtonLink } from "@/components/ui/Button";
import { requirePlayer } from "@/lib/queries/player";

export default async function ProfilePage() {
  const player = await requirePlayer();
  const verified = player.telegram_contact_verified;

  return (
    <div className="orbit-profile-page">
      <div className="orbit-page-head">
        <div>
          <h1 className="orbit-page-title">Мой профиль</h1>
          <p className="orbit-page-sub">
            P{player.code} · {verified ? "telegram-контакт подтверждён" : "контакт указан вручную"}
          </p>
        </div>
        <ButtonLink href="/me" size="sm" variant="secondary">
          В кабинет
        </ButtonLink>
      </div>

      <div className="orbit-profile-grid">
        <div className="orbit-profile-main">
          <section className="orbit-profile-card orbit-frame">
            <div className="orbit-profile-card-head">
              <h2>Профиль игрока</h2>
              <span>{verified ? "вход подтверждён" : "контакт вручную"}</span>
            </div>
            <div className="orbit-profile-form">
              <ProfileForm values={player} editing />
            </div>
          </section>
        </div>

        <aside className="orbit-profile-aside">
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
                  <b>P{player.code}</b>
                  <span>номер игрока, не меняется</span>
                </div>
              </div>
              <div>
                <span className="dot" aria-hidden="true" />
                <div>
                  <b>Вход через Telegram</b>
                  <span>
                    {verified
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
