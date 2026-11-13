import { CommunityTeamForm } from "@/components/player/TeamForms";
import { ButtonLink } from "@/components/ui/Button";
import { requirePlayer } from "@/lib/queries/player";

export default async function NewCommunityTeamPage() {
  await requirePlayer();

  return (
    <div className="orbit-profile-page">
      <div className="orbit-page-head">
        <div>
          <h1 className="orbit-page-title">Собрать своих</h1>
          <p className="orbit-page-sub">новая команда · вы станете главным капитаном</p>
        </div>
        <ButtonLink href="/me" variant="secondary">
          В кабинет
        </ButtonLink>
      </div>

      <div className="orbit-profile-grid">
        <div className="orbit-profile-main">
          <section className="orbit-profile-card orbit-frame">
            <div className="orbit-profile-card-head">
              <h2>Команда</h2>
              <span>видно публично</span>
            </div>
            <div className="orbit-form-scope">
              <CommunityTeamForm />
            </div>
          </section>
        </div>

        <aside className="orbit-profile-aside">
          <section className="orbit-profile-card orbit-frame">
            <div className="orbit-profile-card-head">
              <h2>Что дальше</h2>
            </div>
            <div className="orbit-profile-vis">
              <div>
                <span className="dot" aria-hidden="true" />
                <div>
                  <b>Название и тег</b>
                  <span>их увидят на странице команды и в сетке</span>
                </div>
              </div>
              <div>
                <span className="dot" aria-hidden="true" />
                <div>
                  <b>Состав</b>
                  <span>пригласите игроков по нику или ссылке</span>
                </div>
              </div>
              <div>
                <span className="dot" aria-hidden="true" />
                <div>
                  <b>Заявка на турнир</b>
                  <span>появится у команды, когда состав будет готов</span>
                </div>
              </div>
            </div>
          </section>

          <section className="orbit-profile-card orbit-frame">
            <div className="orbit-profile-card-head">
              <h2>Роль</h2>
            </div>
            <div className="orbit-profile-vis">
              <div>
                <span className="dot" aria-hidden="true" />
                <div>
                  <b>Главный капитан</b>
                  <span>данные команды, состав и капитаны</span>
                </div>
              </div>
              <div>
                <span className="dot" data-open="false" aria-hidden="true" />
                <div>
                  <b>Само по себе не заявка</b>
                  <span>на турнир команду подаёт капитан отдельно</span>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
