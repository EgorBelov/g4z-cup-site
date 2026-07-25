import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/PageHeader";
import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils/cn";

export type AdminTab = { href: string; label: string };

/**
 * Admin chrome. Navigation is a plain server-rendered list so the panel works
 * on a phone with a flaky connection — which is where it is actually used.
 */
export function AdminShell({
  title,
  subtitle,
  tabs,
  activeHref,
  actions,
  publicHref,
  children,
}: {
  title: string;
  subtitle?: string;
  tabs?: AdminTab[];
  activeHref?: string;
  actions?: ReactNode;
  publicHref?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-edge bg-surface/90 backdrop-blur-xl">
        <Container>
          <div className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <Link
                href="/admin"
                className="text-[11px] uppercase tracking-[0.2em] text-accent"
              >
                Админка G4Z CUP
              </Link>
              <h1 className="truncate text-lg font-bold tracking-tight">{title}</h1>
              {subtitle ? (
                <p className="truncate text-xs text-ink-faint">{subtitle}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {actions}
              {publicHref ? (
                <Link
                  href={publicHref}
                  className="rounded-control border border-edge bg-panel px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
                >
                  Открыть на сайте
                </Link>
              ) : null}
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-control border border-edge bg-panel px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
                >
                  Выйти
                </button>
              </form>
            </div>
          </div>

          {tabs && tabs.length > 0 ? (
            <nav className="scrollbar-none -mx-1 overflow-x-auto pb-3">
              <div className="flex min-w-max gap-2 px-1">
                {tabs.map((tab) => (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      "whitespace-nowrap rounded-control border px-3 py-1.5 text-sm font-medium transition",
                      tab.href === activeHref
                        ? "border-accent/30 bg-accent-soft text-accent"
                        : "border-edge bg-panel text-ink-muted hover:text-ink",
                    )}
                  >
                    {tab.label}
                  </Link>
                ))}
              </div>
            </nav>
          ) : null}
        </Container>
      </header>

      <main className="flex-1">
        <Container className="py-6 sm:py-8">{children}</Container>
      </main>
    </div>
  );
}

export function tournamentTabs(slug: string): AdminTab[] {
  const base = `/admin/t/${slug}`;
  return [
    { href: base, label: "Турнир" },
    { href: `${base}/structure`, label: "Этапы и сетка" },
    { href: `${base}/teams`, label: "Команды" },
    { href: `${base}/matches`, label: "Матчи" },
    { href: `${base}/live`, label: "Ведение матча" },
    { href: `${base}/results`, label: "Итоги" },
  ];
}
