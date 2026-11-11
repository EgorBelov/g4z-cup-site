import Link from "next/link";
import { Container } from "@/components/ui/PageHeader";
import { BrandMark } from "@/components/brand/BrandMark";
import { community } from "@/lib/community";
import { MotionToggle } from "@/components/brand/MotionSettings";

export function SiteFooter() {
  return (
    <footer className="orbit-footer mt-16 pb-7 pt-4">
      <Container>
        <div className="flex flex-col gap-6 border-t border-edge pt-7 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3 hover:text-ink">
            <BrandMark className="size-9" />
            <span className="orbit-footer-brand">G4Z CUP</span>
          </Link>
          <nav
            aria-label="Ссылки в подвале"
            className="flex flex-wrap items-center gap-x-6 gap-y-2"
          >
            <Link href="/" className="inline-flex min-h-11 items-center hover:text-ink">
              Сообщество
            </Link>
            <Link
              href="/#tournaments"
              className="inline-flex min-h-11 items-center hover:text-ink"
            >
              Турниры
            </Link>
            <Link
              href="/archive"
              className="inline-flex min-h-11 items-center hover:text-ink"
            >
              Архив
            </Link>
          </nav>
          <span className="orbit-footer-motto">На одной орбите</span>
        </div>
        <details className="orbit-footer-extra">
          <summary>Дополнительно</summary>
          <nav aria-label="Дополнительные ссылки">
            {community.stream ? (
              <a
                href={community.stream}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center hover:text-ink"
              >
                Эфир ↗
              </a>
            ) : null}
            {community.telegram ? (
              <a
                href={community.telegram}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center hover:text-ink"
              >
                Telegram ↗
              </a>
            ) : null}
            <Link
              href="/admin"
              className="inline-flex min-h-11 items-center hover:text-ink"
            >
              Организаторам
            </Link>
            <MotionToggle />
            <Link
              href="/register"
              prefetch={false}
              className="inline-flex min-h-11 items-center hover:text-ink"
            >
              Создать аккаунт ↗
            </Link>
          </nav>
        </details>
      </Container>
    </footer>
  );
}
