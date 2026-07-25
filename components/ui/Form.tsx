"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { Button, buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import type { ActionState } from "@/lib/actions/state";

/** Submit button that disables itself while the action is in flight. */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  size = "md",
  className,
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "live";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
    >
      {pending ? (pendingLabel ?? "Сохраняем…") : children}
    </Button>
  );
}

/** Icon-sized submit for inline row actions. */
export function IconSubmit({
  children,
  title,
  variant = "secondary",
  className,
}: {
  children: ReactNode;
  title: string;
  variant?: "secondary" | "danger" | "ghost";
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      title={title}
      aria-label={title}
      disabled={pending}
      className={buttonClass(variant, "sm", cn("px-2.5", className))}
    >
      {children}
    </button>
  );
}

export function FormFeedback({ state }: { state: ActionState }) {
  if (!state.error && !state.message) return null;

  return (
    <div
      role="status"
      className={cn(
        "rounded-control border px-4 py-3 text-sm",
        state.error
          ? "border-live/40 bg-live-soft text-live"
          : "border-accent/30 bg-accent-soft text-accent",
      )}
    >
      {state.error ?? state.message}
    </div>
  );
}
