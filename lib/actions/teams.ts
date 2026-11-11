"use server";

import { redirect } from "next/navigation";
import { assertAdmin, requestIp } from "@/lib/auth/guard";
import { writeClient } from "@/lib/supabase/write";
import { audit } from "@/lib/audit";
import { invalidate } from "@/lib/actions/revalidate";
import { tags } from "@/lib/cache/tags";
import { fail, parseForm, type ActionState } from "@/lib/actions/state";
import {
  assignGroupSchema,
  deleteEntitySchema,
  rosterSchema,
  teamSchema,
} from "@/lib/validation/schemas";
import { slugify, uniqueSlug } from "@/lib/utils/slug";
import type { Team, Tournament } from "@/lib/types/database";

async function tournamentSlug(id: number): Promise<string> {
  const { data, error } = await writeClient()
    .from("tournaments")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) throw new Error("Турнир не найден");
  return (data as Pick<Tournament, "slug">).slug;
}

export async function saveTeamAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();

  const parsed = parseForm(teamSchema, formData);
  if (parsed.state) return parsed.state;

  const input = parsed.data;
  const client = writeClient();
  const slug = await tournamentSlug(input.tournament_id);

  let teamSlugValue =
    input.slug && input.slug !== "" ? input.slug : slugify(input.name);

  if (!input.team_id) {
    const existing = await client
      .from("teams")
      .select("slug")
      .eq("tournament_id", input.tournament_id);

    if (existing.error) return fail(existing.error.message);

    teamSlugValue = uniqueSlug(
      teamSlugValue,
      (existing.data as Pick<Team, "slug">[]).map((team) => team.slug),
    );
  }

  const row = {
    tournament_id: input.tournament_id,
    slug: teamSlugValue,
    name: input.name,
    tag: input.tag,
    seed: input.seed,
    group_id: input.group_id,
    description: input.description,
    logo_url: input.logo_url,
  };

  if (input.team_id) {
    const { error } = await client.from("teams").update(row).eq("id", input.team_id);
    if (error) return fail(`Не удалось сохранить команду: ${error.message}`);

    await audit({
      action: "team.update",
      entity: "team",
      entityId: input.team_id,
      summary: `Обновлена команда ${row.name}`,
      payload: row,
    });

    invalidate(tags.teams(slug), tags.matches(slug), tags.tournaments());
    redirect(`/admin/t/${slug}/teams/${input.team_id}`);
  }

  const { data, error } = await client.from("teams").insert(row).select("id").single();
  if (error) return fail(`Не удалось создать команду: ${error.message}`);

  const created = (data as { id: number }).id;

  await audit({
    action: "team.create",
    entity: "team",
    entityId: created,
    summary: `Создана команда ${row.name}`,
    payload: row,
  });

  invalidate(tags.teams(slug), tags.matches(slug), tags.tournaments());
  redirect(`/admin/t/${slug}/teams/${created}`);
}

export async function deleteTeamAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const parsed = parseForm(deleteEntitySchema, formData);
  if (parsed.state) throw new Error(parsed.state.error ?? "Некорректный запрос");

  const slug = await tournamentSlug(parsed.data.tournament_id);

  const { error } = await writeClient().from("teams").delete().eq("id", parsed.data.id);

  if (error) throw new Error(`Не удалось удалить команду: ${error.message}`);

  await audit({
    action: "team.delete",
    entity: "team",
    entityId: parsed.data.id,
    summary: "Команда удалена",
  });

  invalidate(tags.teams(slug), tags.matches(slug), tags.tournaments());
  redirect(`/admin/t/${slug}/teams`);
}

/** Roster MMR is optional and free-form in the form; anything unparseable is dropped. */
function parseMmr(value: string | undefined): number | null {
  const digits = (value ?? "").replace(/\s+/g, "");
  if (digits === "") return null;

  const parsed = Number(digits);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 20000) return null;
  return parsed;
}

/**
 * Stable IDs identify players; row position only controls display order.
 * The RPC checks ownership and version and saves the entire roster atomically.
 */
export async function saveRosterAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();

  const parsed = parseForm(rosterSchema, formData);
  if (parsed.state) return parsed.state;

  const {
    team_id: teamId,
    roster_version,
    player_id,
    nickname,
    real_name,
    role,
    mmr,
    captain,
    is_standin,
  } = parsed.data;
  const client = writeClient();

  const teamResult = await client
    .from("teams")
    .select("id, tournament_id, name, community_team_id")
    .eq("id", teamId)
    .maybeSingle();

  if (teamResult.error || !teamResult.data) return fail("Команда не найдена");
  if (teamResult.data.community_team_id)
    return fail("Состав этой команды изменяется через её турнирную заявку");
  const team = teamResult.data as Pick<Team, "id" | "tournament_id" | "name">;
  const slug = await tournamentSlug(team.tournament_id);

  const rows = nickname
    .map((value, index) => ({
      id: player_id[index],
      nickname: value.trim(),
      real_name: (real_name[index] ?? "").trim() || null,
      role: (role[index] ?? "").trim() || null,
      mmr: parseMmr(mmr[index]),
      is_captain: captain === index + 1,
      is_standin: is_standin[index] === "true",
      sort_order: index + 1,
    }))
    .filter((row) => row.nickname !== "");

  const { error } = await client.rpc("save_roster", {
    p_team_id: teamId,
    p_expected_version: roster_version,
    p_players: rows,
    p_ip: await requestIp(),
  });
  if (error) return fail(`Не удалось сохранить состав: ${error.message}`);

  // Match pages share the teams tag because they include rosters, too.
  invalidate(tags.teams(slug), tags.results(slug));
  redirect(`/admin/t/${slug}/teams/${teamId}`);
}

export async function assignGroupAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const parsed = parseForm(assignGroupSchema, formData);
  if (parsed.state) throw new Error(parsed.state.error ?? "Некорректный запрос");

  const slug = await tournamentSlug(parsed.data.tournament_id);

  const { error } = await writeClient()
    .from("teams")
    .update({ group_id: parsed.data.group_id })
    .eq("id", parsed.data.team_id);

  if (error) throw new Error(error.message);

  await audit({
    action: "team.assign_group",
    entity: "team",
    entityId: parsed.data.team_id,
    summary: `Команда переведена в группу ${parsed.data.group_id ?? "—"}`,
  });

  invalidate(tags.teams(slug), tags.matches(slug), tags.structure(slug));
}
