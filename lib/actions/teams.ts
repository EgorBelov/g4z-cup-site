"use server";

import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/auth/guard";
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
import type { Player, Team, Tournament } from "@/lib/types/database";

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

    invalidate(tags.teams(slug), tags.matches(slug));
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

  invalidate(tags.teams(slug), tags.matches(slug));
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

  invalidate(tags.teams(slug), tags.matches(slug));
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
 * Saves a roster by diffing against the stored one.
 *
 * The v1 panel deleted every player and re-inserted them, so a failure halfway
 * through lost the roster. Here existing rows are updated in place and only the
 * genuinely removed ones are deleted.
 */
export async function saveRosterAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();

  const parsed = parseForm(rosterSchema, formData);
  if (parsed.state) return parsed.state;

  const { team_id: teamId, nickname, real_name, role, mmr, captain } = parsed.data;
  const client = writeClient();

  const teamResult = await client
    .from("teams")
    .select("id, tournament_id, name")
    .eq("id", teamId)
    .maybeSingle();

  if (teamResult.error || !teamResult.data) return fail("Команда не найдена");
  const team = teamResult.data as Pick<Team, "id" | "tournament_id" | "name">;
  const slug = await tournamentSlug(team.tournament_id);

  const rows = nickname
    .map((value, index) => ({
      nickname: value.trim(),
      real_name: (real_name[index] ?? "").trim() || null,
      role: (role[index] ?? "").trim() || null,
      mmr: parseMmr(mmr[index]),
      is_captain: captain === index + 1,
      sort_order: index + 1,
    }))
    .filter((row) => row.nickname !== "");

  const existingResult = await client
    .from("players")
    .select("*")
    .eq("team_id", teamId)
    .order("sort_order");

  if (existingResult.error) return fail(existingResult.error.message);
  const existing = existingResult.data as Player[];

  const updates = rows.map((row, index) => {
    const current = existing[index];
    if (current) {
      return client
        .from("players")
        .update({ ...row, sort_order: index + 1 })
        .eq("id", current.id);
    }
    return client.from("players").insert({ ...row, team_id: teamId });
  });

  const results = await Promise.all(updates);
  const firstError = results.find((result) => result.error)?.error;
  if (firstError) return fail(`Не удалось сохранить состав: ${firstError.message}`);

  const removed = existing.slice(rows.length).map((player) => player.id);
  if (removed.length > 0) {
    const { error } = await client.from("players").delete().in("id", removed);
    if (error) return fail(`Не удалось удалить лишних игроков: ${error.message}`);
  }

  await audit({
    action: "roster.replace",
    entity: "team",
    entityId: teamId,
    summary: `Состав ${team.name}: ${rows.length} игроков`,
    payload: rows,
  });

  invalidate(tags.teams(slug));
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
