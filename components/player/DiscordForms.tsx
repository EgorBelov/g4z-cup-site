"use client";
import { useActionState } from "react";
import { FormFeedback, SubmitButton } from "@/components/ui/Form";
import { idle } from "@/lib/actions/state";
import {
  adminSyncDiscordAction,
  discordUnlinkAction,
  syncTeamDiscordAction,
} from "@/lib/actions/discord";

/**
 * Discord buttons are plain forms: the mutation only touches the server and the
 * refreshed page shows the new state.
 */
export function DiscordSyncForm({
  teamId,
  admin = false,
  label = "Пересинхронизировать",
  className = "",
}: {
  teamId?: number;
  admin?: boolean;
  label?: string;
  className?: string;
}) {
  const [state, action] = useActionState(
    admin ? adminSyncDiscordAction : syncTeamDiscordAction,
    idle,
  );

  return (
    <form action={action} className={`space-y-3 ${className}`}>
      {teamId ? <input type="hidden" name="team_id" value={teamId} /> : null}
      <FormFeedback state={state} />
      <SubmitButton size="sm" variant="secondary" pendingLabel="Синхронизируем…">
        {label}
      </SubmitButton>
    </form>
  );
}

export function DiscordUnlinkForm({ className = "" }: { className?: string }) {
  const [state, action] = useActionState(discordUnlinkAction, idle);

  return (
    <form action={action} className={`space-y-3 ${className}`}>
      <FormFeedback state={state} />
      <SubmitButton size="sm" variant="danger" pendingLabel="Отвязываем…">
        Отвязать Discord
      </SubmitButton>
    </form>
  );
}
