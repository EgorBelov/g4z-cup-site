import { ButtonLink } from "@/components/ui/Button";
import { Container, PageHeader } from "@/components/ui/PageHeader";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center">
      <Container className="py-16">
        <PageHeader
          eyebrow="404"
          title="Страница не найдена"
          description="Возможно, турнир ещё не опубликован или ссылка устарела."
          actions={
            <>
              <ButtonLink href="/">На главную</ButtonLink>
              <ButtonLink href="/archive" variant="secondary">
                Архив турниров
              </ButtonLink>
            </>
          }
        />
      </Container>
    </main>
  );
}
