"use server";

import { assertAdmin } from "@/lib/auth/guard";
import { writeClient } from "@/lib/supabase/write";
import { audit } from "@/lib/audit";
import { invalidate } from "@/lib/actions/revalidate";
import { tags } from "@/lib/cache/tags";
import { done, fail, parseForm, type ActionState } from "@/lib/actions/state";
import {
  awardDeleteSchema,
  awardSchema,
  placementDeleteSchema,
  placementSchema,
  tournamentIdSchema,
} from "@/lib/validation/schemas";
import type { MatchDetails, StandingRow, Tournament } from "@/lib/types/database";

async function tournamentRef(id: number): Promise<Pick<Tournament, "id" | "slug">> {
  const { data, error } = await writeClient()
    .from("tournaments")
    .select("id, slug")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) throw new Error("Турнир не найден");
  return data as Pick<Tournament, "id" | "slug">;
}

export async function savePlacementAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();

  const parsed = parseForm(placementSchema, formData);
  if (parsed.state) return parsed.state;

  const input = parsed.data;
  const tournament = await tournamentRef(input.tournament_id);

  const { error } = await writeClient().from("placements").upsert(
    {
      tournament_id: input.tournament_id,
      place: input.place,
      team_id: input.team_id,
      team_label: input.team_label,
      prize: input.prize,
      note: input.note,
    },
    { onConflict: "tournament_id,place" },
  );

  if (error) return fail(`Не удалось сохранить место: ${error.message}`);

  await audit({
    action: "placement.save",
    entity: "tournament",
    entityId: input.tournament_id,
    summary: `Место ${input.place} сохранено`,
    payload: input,
  });

  invalidate(tags.results(tournament.slug), tags.tournaments());
  return done(`Место ${input.place} сохранено`);
}

export async function deletePlacementAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const parsed = parseForm(placementDeleteSchema, formData);
  if (parsed.state) throw new Error(parsed.state.error ?? "Некорректный запрос");

  const tournament = await tournamentRef(parsed.data.tournament_id);

  const { error } = await writeClient()
    .from("placements")
    .delete()
    .eq("id", parsed.data.placement_id);

  if (error) throw new Error(error.message);

  await audit({
    action: "placement.delete",
    entity: "tournament",
    entityId: parsed.data.tournament_id,
    summary: "Место удалено",
  });

  invalidate(tags.results(tournament.slug), tags.tournaments());
}

export async function saveAwardAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();

  const parsed = parseForm(awardSchema, formData);
  if (parsed.state) return parsed.state;

  const input = parsed.data;
  const tournament = await tournamentRef(input.tournament_id);
  const client = writeClient();

  const row = {
    tournament_id: input.tournament_id,
    title: input.title,
    nickname: input.nickname,
    team_id: input.team_id,
    note: input.note,
    sort_order: input.sort_order,
  };

  const result = input.award_id
    ? await client.from("awards").update(row).eq("id", input.award_id)
    : await client.from("awards").insert(row);

  if (result.error)
    return fail(`Не удалось сохранить награду: ${result.error.message}`);

  await audit({
    action: input.award_id ? "award.update" : "award.create",
    entity: "tournament",
    entityId: input.tournament_id,
    summary: `Награда «${input.title}»`,
    payload: row,
  });

  invalidate(tags.results(tournament.slug));
  return done("Награда сохранена");
}

export async function deleteAwardAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const parsed = parseForm(awardDeleteSchema, formData);
  if (parsed.state) throw new Error(parsed.state.error ?? "Некорректный запрос");

  const tournament = await tournamentRef(parsed.data.tournament_id);

  const { error } = await writeClient()
    .from("awards")
    .delete()
    .eq("id", parsed.data.award_id);

  if (error) throw new Error(error.message);

  await audit({
    action: "award.delete",
    entity: "tournament",
    entityId: parsed.data.tournament_id,
    summary: "Награда удалена",
  });

  invalidate(tags.results(tournament.slug));
}

/**
 * Derives final places from the bracket and the group table.
 *
 * The top places come from the actual final and third-place match; everyone else
 * is ordered by their group record. Meant as a first draft that the organiser
 * then edits, not as gospel.
 */
export async function autoFillPlacementsAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();

  const parsed = parseForm(tournamentIdSchema, formData);
  if (parsed.state) return parsed.state;

  const tournamentId = parsed.data.tournament_id;
  const tournament = await tournamentRef(tournamentId);
  const client = writeClient();

  const [matchesResult, standingsResult] = await Promise.all([
    client
      .from("match_details")
      .select("*")
      .eq("tournament_id", tournamentId)
      .in("stage_kind", ["single_elim", "double_elim"])
      .order("stage_order")
      .order("round")
      .order("position"),
    client
      .from("standings")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("wins", { ascending: false })
      .order("map_diff", { ascending: false }),
  ]);

  if (matchesResult.error) return fail(matchesResult.error.message);
  if (standingsResult.error) return fail(standingsResult.error.message);

  const matches = matchesResult.data as MatchDetails[];
  const standings = standingsResult.data as StandingRow[];

  const finals = matches.filter(
    (match) => match.bracket === "final" && match.status === "finished",
  );

  const grandFinal = finals
    .filter((match) => !isThirdPlace(match))
    .sort((a, b) => b.round - a.round)[0];

  const thirdPlaceMatch = finals.find(isThirdPlace);

  const order: number[] = [];
  const push = (teamId: number | null | undefined): void => {
    if (teamId && !order.includes(teamId)) order.push(teamId);
  };

  push(grandFinal?.winner_id);
  push(grandFinal?.loser_id);
  push(thirdPlaceMatch?.winner_id);
  push(thirdPlaceMatch?.loser_id);

  if (!thirdPlaceMatch) {
    // Double elimination: the lower bracket final loser finishes third.
    const lowerFinal = matches
      .filter((match) => match.bracket === "lower" && match.status === "finished")
      .sort((a, b) => b.round - a.round)[0];
    push(lowerFinal?.loser_id);
  }

  for (const row of standings) push(row.team_id);

  if (order.length === 0) {
    return fail("Пока нечего заполнять: нет ни завершённого плей-офф, ни таблицы");
  }

  const rows = order.map((teamId, index) => ({
    tournament_id: tournamentId,
    place: index + 1,
    team_id: teamId,
    team_label: null,
    note: index === 0 ? "Чемпион" : index === 1 ? "Финалист" : null,
  }));

  const { error } = await client
    .from("placements")
    .upsert(rows, { onConflict: "tournament_id,place" });

  if (error) return fail(`Не удалось заполнить места: ${error.message}`);

  await audit({
    action: "placements.autofill",
    entity: "tournament",
    entityId: tournamentId,
    summary: `Автозаполнение итогов: мест ${rows.length}`,
    payload: rows,
  });

  invalidate(tags.results(tournament.slug), tags.tournaments());
  return done(`Заполнено мест: ${rows.length}. Проверьте и поправьте вручную.`);
}

function isThirdPlace(match: MatchDetails): boolean {
  return (match.round_label ?? "").toLowerCase().includes("3 место");
}
