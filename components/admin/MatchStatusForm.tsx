"use client";

import { useActionState, type ReactNode } from "react";
import { FormFeedback, IconSubmit } from "@/components/ui/Form";
import { setMatchStatusAction } from "@/lib/actions/matches";
import { idle } from "@/lib/actions/state";

export function MatchStatusForm({
  matchId,
  status,
  label,
  variant = "secondary",
  children,
}: {
  matchId: number;
  status: "scheduled" | "live" | "cancelled";
  label: string;
  variant?: "secondary" | "danger";
  children?: ReactNode;
}) {
  const [state, action] = useActionState(setMatchStatusAction, idle);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="match_id" value={matchId} />
      <input type="hidden" name="status" value={status} />
      <IconSubmit title={label} variant={variant}>
        {children ?? label}
      </IconSubmit>
      <FormFeedback state={state} />
    </form>
  );
}
