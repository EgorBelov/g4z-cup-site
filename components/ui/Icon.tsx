import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

const drawings = {
  arrow: <path d="M7 17 17 7M7 7h10v10" />,
  trophy: (
    <>
      <path d="M8 3h8v6a4 4 0 0 1-8 0V3ZM8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 13v5m-4 3h8m-7-3h6v3" />
    </>
  ),
  game: (
    <>
      <path d="M7 7h10c2 0 3 2 3.5 4l1 5c.5 3-2 4-4 2l-2-2h-7l-2 2c-2 2-4.5 1-4-2l1-5C4 9 5 7 7 7Z" />
      <path d="M6 11v4m-2-2h4m8-1h.01m2 2h.01M9 7V4h6" />
    </>
  ),
  swords: (
    <>
      <path d="m4 3 5 2 10 12-2 2L5 9 4 3Zm16 0-5 2-3 4m-3 4-4 4 2 2 4-4M3 16l5 5m8-18 5 5M16 21l5-5M4 20l-1 1m17-1 1 1" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v4m0 14v4M1 12h4m14 0h4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v3" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M7 3v4m10-4v4M3 11h18M7 15h3m4 0h3m-10 3h3" />
    </>
  ),
  bracket: <path d="M3 3h5v6H3m0 6h5v6H3M8 6h5v12H8m5-6h7m-3-3 3 3-3 3" />,
  chart: (
    <>
      <path d="M4 3v18h17M8 17v-5m5 5V7m5 10V4" />
    </>
  ),
  archive: (
    <>
      <rect x="3" y="3" width="18" height="5" rx="1" />
      <path d="M5 8v13h14V8m-10 5h6" />
    </>
  ),
  play: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="m10 9 5 3-5 3V9Z" />
    </>
  ),
  telegram: <path d="m21 3-4 18-6-5-4 3 1-6 10-7-12 5-4-2L21 3Z" />,
  spark: <path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Zm7 0v4m-2-2h4" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof drawings;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-5 shrink-0", className)}
    >
      {drawings[name]}
    </svg>
  );
}
