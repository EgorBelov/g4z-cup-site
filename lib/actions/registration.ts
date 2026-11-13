"use server";
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { assertAdmin, requestIp } from "@/lib/auth/guard";
import { assertPlayer } from "@/lib/auth/player";
import { authRequestOrigin } from "@/lib/auth/origin";
import { writeClient } from "@/lib/supabase/write";
import { fail, done, parseForm, type ActionState } from "@/lib/actions/state";
import {
  communityTeamSchema,
  registrationCommandSchema,
  updateProfileSchema,
  playerSearchSchema,
} from "@/lib/validation/schemas";
import { slugify } from "@/lib/utils/slug";
import { invalidate } from "@/lib/actions/revalidate";
import { tags } from "@/lib/cache/tags";
import type { PublicRegistrant } from "@/lib/types/registration";

export type RegistrationState = ActionState & {
  inviteUrl?: string;
  players?: PublicRegistrant[];
};
function message(error: { code?: string; message: string }): string {
  if (error.code === "P0001" || error.code === "40001" || error.code === "42501")
    return error.message;
  if (error.code === "23505")
    return "Адрес команды занят или игрок уже состоит в заявке этого турнира";
  return "Не удалось выполнить действие. Обновите страницу и попробуйте снова";
}
async function execute(
  actor: string | null,
  admin: boolean,
  action: string,
  input: Record<string, unknown>,
) {
  const { data, error } = await writeClient().rpc(
    action.startsWith("community_")
      ? "community_member_command"
      : "registration_command",
    {
      p_actor: actor,
      p_admin: admin,
      p_action: action,
      p_input: input,
      p_ip: await requestIp(),
    },
  );
  if (error) return { error: message(error) };
  const result = data as {
    application_id: number | null;
    team_id: number | null;
    slug: string | null;
    tournament_slug: string | null;
  };
  if (action.startsWith("community_")) {
    invalidate(tags.communityTeams());
  } else {
    invalidate(
      tags.communityTeams(),
      result.tournament_slug ? tags.teams(result.tournament_slug) : null,
      result.tournament_slug ? tags.tournament(result.tournament_slug) : null,
      result.tournament_slug ? tags.results(result.tournament_slug) : null,
      tags.tournaments(),
    );
  }
  return { result };
}
export async function updatePlayerProfileAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await assertPlayer();
  const parsed = parseForm(updateProfileSchema, formData);
  if (parsed.state) return parsed.state;
  const result = await execute(actor.user.id, false, "profile_update", {
    ...parsed.data,
    verified_username: actor.identity.username,
  });
  return result.error
    ? fail(result.error)
    : done("Профиль сохранён. Принятые составы и история турниров не изменены");
}
export async function saveCommunityTeamAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await assertPlayer();
  const parsed = parseForm(communityTeamSchema, formData);
  if (parsed.state) return parsed.state;
  if (parsed.data.team_id && parsed.data.team_version === undefined)
    return fail("Обновите страницу команды");
  const input = {
    ...parsed.data,
    slug:
      parsed.data.slug ||
      `${slugify(parsed.data.name).slice(0, 45) || "team"}-${randomBytes(4).toString("hex")}`,
  };
  const compact = Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== null && v !== undefined),
  );
  const result = await execute(
    actor.user.id,
    false,
    parsed.data.team_id ? "team_update" : "team_create",
    compact,
  );
  if (result.error) return fail(result.error);
  if (!parsed.data.team_id) redirect(`/me/teams/${result.result!.team_id}`);
  return done("Команда сохранена");
}
export async function adminSaveCommunityTeamAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();
  const parsed = parseForm(communityTeamSchema, formData);
  if (parsed.state) return parsed.state;
  if (!parsed.data.team_id || parsed.data.team_version === undefined)
    return fail("Обновите страницу команды");
  const result = await execute(null, true, "team_update", parsed.data);
  return result.error
    ? fail(result.error)
    : done("Данные команды сохранены организатором");
}
export async function playerRegistrationCommandAction(
  _state: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const actor = await assertPlayer();
  const parsed = parseForm(registrationCommandSchema, formData);
  if (parsed.state) return parsed.state;
  const input = parsed.data;
  if (
    ["review", "admin_member", "captain_direct", "team_restore"].includes(input.action)
  )
    return fail("Это действие доступно организатору");
  const compact: Record<string, unknown> = Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== null && v !== undefined && v !== ""),
  );
  let inviteUrl: string | undefined;
  if (input.token) {
    compact.token_hash = createHash("sha256").update(input.token).digest("hex");
    delete compact.token;
  }
  if (input.action === "invite_create" && !input.recipient_id) {
    const token = randomBytes(32).toString("base64url");
    compact.token_hash = createHash("sha256").update(token).digest("hex");
    inviteUrl = `${await authRequestOrigin()}/invite/${token}`;
  }
  const result = await execute(actor.user.id, false, input.action, compact);
  if (result.error) return fail(result.error);
  if (["application_create", "invite_accept"].includes(input.action))
    redirect(`/me/applications/${result.result!.application_id}`);
  if (input.action === "captain_accept")
    redirect(`/me/teams/${result.result!.team_id}`);
  return { ...done("Готово"), inviteUrl };
}
export async function adminRegistrationCommandAction(
  _state: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  await assertAdmin();
  const parsed = parseForm(registrationCommandSchema, formData);
  if (parsed.state) return parsed.state;
  if (
    ![
      "review",
      "admin_member",
      "member_remove",
      "member_slot",
      "captain_direct",
      "second_remove",
      "team_archive",
      "team_restore",
      "application_create",
    ].includes(parsed.data.action)
  )
    return fail("Недоступное действие организатора");
  const input = Object.fromEntries(
    Object.entries(parsed.data).filter(
      ([, v]) => v !== null && v !== undefined && v !== "",
    ),
  );
  const result = await execute(null, true, parsed.data.action, input);
  return result.error ? fail(result.error) : done("Изменения организатора сохранены");
}
export async function searchPlayersAction(
  _state: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const actor = await assertPlayer();
  const parsed = parseForm(playerSearchSchema, formData);
  if (parsed.state) return parsed.state;
  const { data, error } = await writeClient().rpc("search_registration_players", {
    p_actor: actor.user.id,
    p_admin: false,
    p_team: parsed.data.team_id,
    p_query: parsed.data.query,
  });
  return error
    ? fail(message(error))
    : { ok: true, players: data as PublicRegistrant[] };
}
export async function adminSearchPlayersAction(
  _state: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  await assertAdmin();
  const parsed = parseForm(playerSearchSchema, formData);
  if (parsed.state) return parsed.state;
  const { data, error } = await writeClient().rpc("search_registration_players", {
    p_actor: null,
    p_admin: true,
    p_team: parsed.data.team_id,
    p_query: parsed.data.query,
  });
  return error
    ? fail(message(error))
    : { ok: true, players: data as PublicRegistrant[] };
}
