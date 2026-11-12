import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/PageHeader";
import { community } from "@/lib/community";

/**
 * Тело страницы 404 без шапки: шапку даёт либо общий layout, либо
 * `app/not-found.tsx` для маршрутов, у которых своего layout нет.
 */
export function NotFoundBlock() {
  return (
    <div className="orbit-err">
      <span className="orbit-err-glow" aria-hidden="true" />
      <span className="orbit-err-zoom" aria-hidden="true">
        404
      </span>

      <Container>
        <div className="orbit-err-body">
          <p className="orbit-err-label">Ошибка 404</p>
          <h1 className="orbit-err-title">Мимо орбиты.</h1>
          <p className="orbit-err-lead">
            Такой страницы нет. Возможно, турнир ещё не опубликован, команда
            переименована или ссылка устарела.
          </p>

          <div className="orbit-err-actions">
            <ButtonLink href="/">На главную</ButtonLink>
            <ButtonLink href="/archive" variant="secondary">
              Архив турниров
            </ButtonLink>
          </div>

          <div className="orbit-err-hint">
            <span>Может пригодиться:</span>
            <Link href="/#tournaments">Турниры ↗</Link>
            <Link href="/archive">Архив ↗</Link>
            <a href={community.telegram} target="_blank" rel="noreferrer">
              Telegram ↗
            </a>
          </div>
        </div>
      </Container>
    </div>
  );
}
