"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { BrandMark } from "@/components/brand/BrandMark";
import { MotionToggle } from "@/components/brand/MotionSettings";
import { Container } from "@/components/ui/PageHeader";
import { community } from "@/lib/community";

export type NavLink = { href: string; label: string };
const defaultLinks: NavLink[] = [
  { href: "/", label: "Сообщество" },
  { href: "/#tournaments", label: "Турниры" },
  { href: "/archive", label: "Архив" },
];

export function SiteHeader({
  title = "G4Z CUP",
  subtitle = "Свои люди. Своя игра.",
  links = defaultLinks,
  streamUrl,
  telegramUrl,
  titleHref,
}: {
  title?: string;
  subtitle?: string;
  badge?: string;
  links?: NavLink[];
  streamUrl?: string | null;
  telegramUrl?: string | null;
  titleHref?: string;
}) {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const active = links
    .filter(
      ({ href }) =>
        !href.includes("#") &&
        (href === pathname || (href !== "/" && pathname.startsWith(`${href}/`))),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const telegram = telegramUrl || community.telegram;
  const stream = streamUrl || community.stream;
  const navLinks = links.map((link) => (
    <Link
      key={link.href}
      href={link.href}
      aria-current={active === link.href ? "page" : undefined}
      className="nav-link"
      onClick={() => {
        if (menu.current) menu.current.open = false;
      }}
    >
      {link.label}
    </Link>
  ));
  const socials = (
    <>
      {stream ? (
        <a href={stream} target="_blank" rel="noreferrer" className="nav-link">
          Эфир ↗
        </a>
      ) : null}
      {telegram ? (
        <a href={telegram} target="_blank" rel="noreferrer" className="nav-link">
          Telegram ↗
        </a>
      ) : null}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-surface/95 backdrop-blur-xl">
      <a
        href="#main-content"
        className="skip-link rounded-pill bg-ink px-5 py-3 text-sm text-surface"
      >
        К содержимому
      </a>
      <Container>
        <div className="flex min-h-[76px] items-center justify-between gap-5 xl:min-h-[88px]">
          <div className="flex min-w-0 flex-col items-start">
            <Link
              href="/"
              aria-label="G4Z CUP — главная"
              className="flex shrink-0 items-center gap-2"
            >
              <BrandMark className="size-11" />
              <span className="text-xl font-bold tracking-[-0.07em]">G4Z CUP</span>
            </Link>
            {titleHref ? (
              <Link
                href={titleHref}
                className="-mt-1 ml-14 block max-w-40 truncate pb-1 text-xs text-ink-faint hover:text-accent"
                title={title}
              >
                {title}
              </Link>
            ) : null}
          </div>
          <nav
            aria-label="Основная навигация"
            className="hidden items-center gap-5 xl:flex"
          >
            {navLinks}
          </nav>
          <div className="hidden shrink-0 items-center gap-5 xl:flex">
            <MotionToggle />
            {socials}
          </div>
          <details
            ref={menu}
            className="mobile-menu xl:hidden"
            onKeyDown={(event) => {
              if (event.key === "Escape" && menu.current) {
                menu.current.open = false;
                menu.current.querySelector("summary")?.focus();
              }
            }}
          >
            <summary
              aria-label="Меню"
              className="grid size-11 list-none place-items-center rounded-pill border border-edge"
            >
              <span
                aria-hidden="true"
                className="menu-lines text-xl transition-transform"
              >
                ＝
              </span>
            </summary>
            <div className="absolute inset-x-0 top-full max-h-[calc(100dvh-76px)] overflow-y-auto border-b border-edge bg-surface px-5 pb-6 pt-3 shadow-xl">
              <p className="eyebrow mb-2">
                {titleHref ? <Link href={titleHref}>{title}</Link> : subtitle}
              </p>
              <nav aria-label="Мобильная навигация" className="grid">
                {navLinks}
              </nav>
              <div className="mt-4 flex flex-wrap items-center gap-5 border-t border-edge pt-3">
                <MotionToggle />
                {socials}
              </div>
            </div>
          </details>
        </div>
      </Container>
    </header>
  );
}
