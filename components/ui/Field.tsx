import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

const control =
  "w-full rounded-control border border-edge bg-surface-sunken px-3.5 py-2.5 text-ink outline-none transition placeholder:text-ink-faint focus:border-accent/60";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string[];
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-ink-muted"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-ink-faint">{hint}</p> : null}
      {error?.length ? (
        <p className="mt-1.5 text-xs text-live">{error.join(". ")}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-24", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(control, className)} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({
  label,
  className,
  ...props
}: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2.5 text-sm text-ink-muted",
        className,
      )}
    >
      <input
        type="checkbox"
        className="size-4 rounded border-edge bg-surface-sunken accent-accent"
        {...props}
      />
      {label}
    </label>
  );
}
