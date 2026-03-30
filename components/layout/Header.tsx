"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Container from "@/components/layout/Container";

const navItems = [
  { href: "/", label: "Главная" },
  { href: "/schedule", label: "Расписание" },
  { href: "/groups", label: "Группы" },
  { href: "/playoff", label: "Плей-офф" },
  { href: "/teams", label: "Команды" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
      <Container>
        <div className="flex min-w-0 items-center justify-between py-3 md:h-16 md:py-0">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-sm font-extrabold text-emerald-300 md:h-10 md:w-10">
              10
            </div>

            <div className="min-w-0">
              <div className="truncate text-xs uppercase tracking-[0.2em] text-white/45 sm:text-sm">
                G4Z CUP
              </div>
              <div className="truncate text-sm font-bold text-white sm:text-base">
                Dota 2
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "rounded-xl px-4 py-2 text-sm font-medium transition",
                    active
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "text-white/70 hover:bg-white/8 hover:text-white",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <a
              href="https://twitch.tv/g4z"
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-500"
            >
              Twitch
            </a>
            <a
              href="https://t.me/g4z"
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500"
            >
              Telegram
            </a>
          </div>
        </div>

        <div className="w-full overflow-x-auto pb-4 lg:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max gap-2">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-medium transition",
                    active
                      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                      : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </Container>
    </header>
  );
}