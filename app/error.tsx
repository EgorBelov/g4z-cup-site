"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/PageHeader";
import { community } from "@/lib/community";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="orbit-community orbit-err">
      <span className="orbit-err-glow" aria-hidden="true" />
      <span className="orbit-err-zoom" aria-hidden="true">
        404
      </span>

      <Container>
        <div className="orbit-err-body">
          <p className="orbit-err-label">Сбой загрузки</p>
          <h1 className="orbit-err-title">Потеряли сигнал.</h1>
          <p className="orbit-err-lead">
            Страница не загрузилась. Попробуйте ещё раз — результаты и сетка турниров
            сохраняются независимо от этой ошибки.
          </p>
          {error.digest ? <p className="orbit-err-code">код: {error.digest}</p> : null}

          <div className="orbit-err-actions">
            <Button onClick={reset}>Обновить</Button>
            <ButtonLink href="/" variant="secondary">
              На главную
            </ButtonLink>
          </div>

          <div className="orbit-err-hint">
            <span>Если не помогает:</span>
            <a href={community.telegram} target="_blank" rel="noreferrer">
              Написать в Telegram ↗
            </a>
            <Link href="/archive">Архив турниров ↗</Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
