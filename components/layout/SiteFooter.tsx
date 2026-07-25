import Link from "next/link";
import { Container } from "@/components/ui/PageHeader";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-edge bg-surface-sunken/60 py-8">
      <Container>
        <div className="flex flex-col gap-4 text-sm text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>G4Z CUP — турниры по Dota 2.</p>
          <nav className="flex flex-wrap gap-4">
            <Link href="/archive" className="hover:text-ink">
              Архив турниров
            </Link>
            <Link href="/admin" className="hover:text-ink">
              Админка
            </Link>
          </nav>
        </div>
      </Container>
    </footer>
  );
}
