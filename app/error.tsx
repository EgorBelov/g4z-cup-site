"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/Button";
import { Container, PageHeader } from "@/components/ui/PageHeader";

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
    <main className="flex min-h-screen items-center">
      <Container className="py-16">
        <PageHeader
          eyebrow="Ошибка"
          title="Что-то сломалось"
          description="Мы записали ошибку. Попробуйте обновить страницу — данные турнира при этом не пострадали."
          actions={
            <>
              <Button onClick={reset}>Обновить</Button>
              <ButtonLink href="/" variant="secondary">
                На главную
              </ButtonLink>
            </>
          }
        />
        {error.digest ? (
          <p className="mt-6 text-xs text-ink-faint">Код ошибки: {error.digest}</p>
        ) : null}
      </Container>
    </main>
  );
}
