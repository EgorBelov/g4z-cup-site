import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/PageHeader";
import { BrandMark } from "@/components/brand/BrandMark";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { buttonClass } from "@/components/ui/Button";
import { logoutAction } from "@/lib/actions/auth";

export type AdminTab = { href: string; label: string };

/** Plain server-rendered links keep the console usable on a flaky connection. */
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
    <div className="admin-shell flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-edge bg-surface/95 backdrop-blur-xl">
        <Container>
          <div className="flex flex-wrap items-center justify-between gap-3 py-4 sm:min-h-[88px]">
            <Link href="/admin" className="flex items-center gap-3">
              <BrandMark className="size-11" />
              <span className="text-xl font-bold tracking-[-0.06em]">G4Z CUP</span>
              <span className="eyebrow ml-2 hidden sm:inline">Организаторам</span>
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              {publicHref ? (
                <Link href={publicHref} className={buttonClass("secondary", "sm")}>
                  На сайт ↗
                </Link>
              ) : (
                <Link href="/" className={buttonClass("secondary", "sm")}>
                  На сайт ↗
                </Link>
              )}
              <form action={logoutAction}>
                <button type="submit" className={buttonClass("ghost", "sm")}>
                  Выйти
                </button>
              </form>
            </div>
          </div>
          {tabs?.length ? (
            <nav
              aria-label="Управление турниром"
              className="scrollbar-none overflow-x-auto"
            >
              <div className="flex min-w-max gap-6">
                {tabs.map((tab) => (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    aria-current={tab.href === activeHref ? "page" : undefined}
                    className="nav-link min-h-12"
                  >
                    {tab.label}
                  </Link>
                ))}
              </div>
            </nav>
          ) : null}
        </Container>
      </header>
      <main id="main-content" className="flex-1">
        <Container className="py-8 sm:py-12">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <div className="min-w-0">
              <p className="eyebrow">Панель организатора</p>
              <h1 className="page-title">{title}</h1>
              {subtitle ? (
                <p className="mt-4 max-w-2xl break-words text-sm leading-relaxed text-ink-faint">
                  {subtitle}
                </p>
              ) : null}
            </div>
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
          </div>
          {children}
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}

export function tournamentTabs(slug: string): AdminTab[] {
  const base = `/admin/t/${slug}`;
  return [
    { href: base, label: "Турнир" },
    { href: `${base}/structure`, label: "Этапы и сетка" },
    { href: `${base}/teams`, label: "Команды" },
    { href: `${base}/registrations`, label: "Заявки" },
    { href: `${base}/matches`, label: "Матчи" },
    { href: `${base}/live`, label: "Ведение матча" },
    { href: `${base}/results`, label: "Итоги" },
    { href: `${base}/history`, label: "Ввод истории" },
  ];
}
