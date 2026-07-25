"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils/cn";

export type NavLink = { href: string; label: string };

export function SiteHeader({
  title,
  subtitle,
  badge,
  links,
  streamUrl,
  telegramUrl,
}: {
  title: string;
  subtitle: string;
  badge: string;
  links: NavLink[];
  streamUrl?: string | null;
  telegramUrl?: string | null;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === pathname || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-surface/85 backdrop-blur-xl">
      <Container>
        <div className="flex items-center justify-between gap-4 py-3 md:h-16 md:py-0">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-control border border-accent/25 bg-accent-soft text-sm font-extrabold text-accent">
              {badge}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[11px] uppercase tracking-[0.2em] text-ink-faint">
                {title}
              </span>
              <span className="block truncate text-sm font-bold">{subtitle}</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-control px-3.5 py-2 text-sm font-medium transition",
                  isActive(link.href)
                    ? "bg-accent-soft text-accent"
                    : "text-ink-muted hover:bg-panel hover:text-ink",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            {streamUrl ? (
              <a
                href={streamUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-control bg-[#9146ff] px-3.5 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                Twitch
              </a>
            ) : null}
            {telegramUrl ? (
              <a
                href={telegramUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-control bg-[#2aabee] px-3.5 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                Telegram
              </a>
            ) : null}
          </div>
        </div>

        <div className="scrollbar-none -mx-1 overflow-x-auto pb-3 lg:hidden">
          <div className="flex min-w-max gap-2 px-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "whitespace-nowrap rounded-control border px-3 py-2 text-sm font-medium transition",
                  isActive(link.href)
                    ? "border-accent/30 bg-accent-soft text-accent"
                    : "border-edge bg-panel text-ink-muted",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </Container>
    </header>
  );
}
