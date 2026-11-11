import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "live";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex min-h-11 items-center justify-center gap-3 rounded-pill text-center font-medium leading-normal transition disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "border border-ink bg-ink text-surface hover:border-accent hover:bg-accent",
  secondary:
    "border border-edge bg-transparent text-ink hover:border-edge-strong hover:bg-panel",
  ghost: "text-ink-muted hover:bg-panel hover:text-ink",
  danger: "border border-live/40 bg-live/10 text-live hover:bg-live/20",
  live: "border border-accent bg-accent text-surface hover:bg-accent/85",
};

const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-5 py-3 text-sm",
  lg: "px-6 py-3.5 text-base",
};

export function buttonClass(
  variant: Variant = "primary",
  size: Size = "md",
  className?: string,
): string {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}) {
  return (
    <button className={buttonClass(variant, size, className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  external,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  external?: boolean;
}) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={buttonClass(variant, size, className)}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      prefetch={/^\/(me|login|register|invite)(\/|\?|$)/.test(href) ? false : undefined}
      className={buttonClass(variant, size, className)}
    >
      {children}
    </Link>
  );
}
