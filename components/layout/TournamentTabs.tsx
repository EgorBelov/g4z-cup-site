"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavLink } from "./SiteHeader";

export function TournamentTabs({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const active = links
    .filter(({ href }) => pathname === href || pathname.startsWith(href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav className="orbit-tournament-tabs" aria-label="Разделы турнира">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={link.href === active ? "page" : undefined}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
