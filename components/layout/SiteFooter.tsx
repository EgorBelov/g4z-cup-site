import Link from "next/link";
import { Container } from "@/components/ui/PageHeader";
import { BrandMark } from "@/components/brand/BrandMark";
import { community } from "@/lib/community";

export function SiteFooter() {
  return (
    <footer className="mt-16 pb-7 pt-4">
      <Container>
        <div className="flex flex-col gap-6 border-t border-edge pt-7 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3 hover:text-ink">
            <BrandMark className="size-9" />
            <span>G4Z CUP / Свои люди. Своя игра.</span>
          </Link>
          <nav
            aria-label="Ссылки в подвале"
            className="flex flex-wrap items-center gap-x-6 gap-y-2"
          >
            <Link
              href="/archive"
              className="inline-flex min-h-11 items-center hover:text-ink"
            >
              Архив турниров ↗
            </Link>
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
          </nav>
        </div>
      </Container>
    </footer>
  );
}
