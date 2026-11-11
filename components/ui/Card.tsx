import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Icon, type IconName } from "./Icon";

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
  icon,
}: {
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  icon?: IconName;
}) {
  return (
    <div className="orbit-card-heading flex flex-wrap items-start justify-between gap-4 px-5 pb-5 pt-7">
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="grid size-10 shrink-0 place-items-center rounded-control bg-accent-soft text-accent">
            <Icon name={icon} />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="section-title">{title}</h2>
          {hint ? <p className="mt-1 text-sm text-ink-faint">{hint}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
  icon = "game",
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  icon?: IconName;
}) {
  return (
    <div className="orbit-empty rounded-control border border-dashed border-edge bg-surface/40 px-5 py-10 text-center">
      <Icon name={icon} className="mx-auto mb-4 size-8 text-ink-faint" />
      <p className="font-medium text-ink-muted">{title}</p>
      {hint ? <p className="mt-2 text-sm text-ink-faint">{hint}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
