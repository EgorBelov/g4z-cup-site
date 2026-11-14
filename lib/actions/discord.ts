"use server";
import "server-only";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/auth/guard";
import { assertPlayer } from "@/lib/auth/player";
import { writeClient } from "@/lib/supabase/write";
import { done, fail, parseForm, type ActionState } from "@/lib/actions/state";
import { discordSyncSchema } from "@/lib/validation/schemas";
import { discordConfigured } from "@/lib/discord/config";
import { syncAllTeams, syncTeam, unlinkDiscord } from "@/lib/discord/provision";

async function teamDiscordError(teamId: number): Promise<string | null> {
  const { data } = await writeClient()
    .from("community_teams")
    .select("discord_error")
    .eq("id", teamId)
    .maybeSingle();
  return (data?.discord_error as string | null) ?? null;
}

/** Unlinks the Discord account after removing the roles the bot granted. */
export async function discordUnlinkAction(
  _state: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const actor = await assertPlayer();
  await unlinkDiscord(actor.user.id);
  refresh();
  redirect("/me/profile?discord=unlinked");
}

/** Captain retry after a failed provisioning (bot was down, category moved…). */
export async function syncTeamDiscordAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await assertPlayer();
  const parsed = parseForm(discordSyncSchema, formData);
  if (parsed.state) return parsed.state;
  const teamId = parsed.data.team_id;
  if (!teamId) return fail("Команда не указана");

  const { data, error } = await writeClient()
    .from("community_teams")
    .select("id,main_captain,second_captain")
    .eq("id", teamId)
    .maybeSingle();
  if (error) return fail("Не удалось проверить команду");
  if (
    !data ||
    (data.main_captain !== actor.user.id && data.second_captain !== actor.user.id)
  )
    return fail("Нет прав на эту команду");
  if (!discordConfigured()) return fail("Discord не настроен");

  await syncTeam(teamId);
  refresh();

  const problem = await teamDiscordError(teamId);
  return problem ? fail(problem) : done("Discord синхронизирован");
}

/** Organiser retry: one team, or every team when `team_id` is empty. */
export async function adminSyncDiscordAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();
  const parsed = parseForm(discordSyncSchema, formData);
  if (parsed.state) return parsed.state;
  if (!discordConfigured()) return fail("Discord не настроен");

  const teamId = parsed.data.team_id;
  if (teamId) {
    await syncTeam(teamId);
    refresh();
    const problem = await teamDiscordError(teamId);
    return problem ? fail(problem) : done("Команда синхронизирована");
  }

  const count = await syncAllTeams();
  refresh();
  return done(`Синхронизировано команд: ${count}`);
}
