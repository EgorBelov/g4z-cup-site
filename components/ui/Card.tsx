import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * `min-w-0` is load-bearing: a card is almost always a grid or flex child, and
 * those default to `min-width: auto`, which refuses to shrink below the content.
 * Without it one wide table inside pushes the whole page past the viewport
 * instead of scrolling inside its own `overflow-x-auto`.
 */
export function Card({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  return (
    <Tag className={cn("min-w-0 rounded-card border border-edge bg-panel", className)}>
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  hint,
  action,
}: {
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-edge px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        {hint ? <p className="mt-1 text-sm text-ink-faint">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-edge bg-surface-sunken/40 px-5 py-10 text-center">
      <p className="font-medium text-ink-muted">{title}</p>
      {hint ? <p className="mt-2 text-sm text-ink-faint">{hint}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
