"use server";

import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/auth/guard";
import { writeClient } from "@/lib/supabase/write";
import { audit } from "@/lib/audit";
import { invalidate } from "@/lib/actions/revalidate";
import { matchWriteTags, tags } from "@/lib/cache/tags";
import { done, fail, parseForm, type ActionState } from "@/lib/actions/state";
import {
  deleteEntitySchema,
  matchSchema,
  matchStatusSchema,
  shiftScheduleSchema,
} from "@/lib/validation/schemas";
import { fromDateTimeLocal } from "@/lib/format/date";
import type { Match, Tournament } from "@/lib/types/database";

type TournamentRef = Pick<Tournament, "id" | "slug" | "time_zone">;

async function loadTournament(id: number): Promise<TournamentRef> {
  const { data, error } = await writeClient()
    .from("tournaments")
    .select("id, slug, time_zone")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) throw new Error("Турнир не найден");
  return data as TournamentRef;
}

export async function matchContext(matchId: number): Promise<TournamentRef> {
  const { data, error } = await writeClient()
    .from("matches")
    .select("tournament_id")
    .eq("id", matchId)
    .maybeSingle();

  if (error || !data) throw new Error("Матч не найден");
  return loadTournament((data as Pick<Match, "tournament_id">).tournament_id);
}

export async function saveMatchAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();

  const parsed = parseForm(matchSchema, formData);
  if (parsed.state) return parsed.state;

  const input = parsed.data;
  const tournament = await loadTournament(input.tournament_id);
  const client = writeClient();

  if (input.team1_id && input.team1_id === input.team2_id) {
    return fail("Команда не может играть сама с собой");
  }

  const row = {
    tournament_id: input.tournament_id,
    stage_id: input.stage_id,
    group_id: input.group_id,
    round: input.round,
    round_label: input.round_label,
    position: input.position,
    best_of: input.best_of,
    team1_id: input.team1_id,
    team2_id: input.team2_id,
    team1_source: input.team1_source,
    team2_source: input.team2_source,
    scheduled_at: input.scheduled_at
      ? fromDateTimeLocal(input.scheduled_at, tournament.time_zone)
      : null,
    stream_url: input.stream_url,
    vod_url: input.vod_url,
    notes: input.notes,
    is_featured: input.is_featured,
  };

  if (input.match_id) {
    const { error } = await client.from("matches").update(row).eq("id", input.match_id);
    if (error) return fail(`Не удалось сохранить матч: ${error.message}`);

    await audit({
      action: "match.update",
      entity: "match",
      entityId: input.match_id,
      summary: `Матч #${input.match_id} обновлён`,
      payload: row,
    });

    invalidate(...matchWriteTags(tournament.slug, input.match_id));
    redirect(`/admin/t/${tournament.slug}/matches/${input.match_id}`);
  }

  const { data, error } = await client
    .from("matches")
    .insert(row)
    .select("id")
    .single();
  if (error) return fail(`Не удалось создать матч: ${error.message}`);

  const created = (data as { id: number }).id;

  await audit({
    action: "match.create",
    entity: "match",
    entityId: created,
    summary: `Создан матч #${created}`,
    payload: row,
  });

  invalidate(...matchWriteTags(tournament.slug, created));
  redirect(`/admin/t/${tournament.slug}/matches/${created}`);
}

export async function deleteMatchAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const parsed = parseForm(deleteEntitySchema, formData);
  if (parsed.state) throw new Error(parsed.state.error ?? "Некорректный запрос");

  const tournament = await loadTournament(parsed.data.tournament_id);

  const { error } = await writeClient()
    .from("matches")
    .delete()
    .eq("id", parsed.data.id);
  if (error) throw new Error(`Не удалось удалить матч: ${error.message}`);

  await audit({
    action: "match.delete",
    entity: "match",
    entityId: parsed.data.id,
    summary: `Матч #${parsed.data.id} удалён`,
  });

  invalidate(...matchWriteTags(tournament.slug, parsed.data.id));
  redirect(`/admin/t/${tournament.slug}/matches`);
}

/**
 * Manual status override. Score and the finished flag are still derived from
 * games; this only starts, cancels or reopens a match.
 */
export async function setMatchStatusAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const parsed = parseForm(matchStatusSchema, formData);
  if (parsed.state) throw new Error(parsed.state.error ?? "Некорректный запрос");

  const { match_id: matchId, status } = parsed.data;
  const tournament = await matchContext(matchId);

  const patch: Record<string, unknown> = { status };
  if (status === "live") patch.started_at = new Date().toISOString();
  if (status === "scheduled") {
    patch.started_at = null;
    patch.finished_at = null;
  }

  const { error } = await writeClient().from("matches").update(patch).eq("id", matchId);
  if (error) throw new Error(error.message);

  await audit({
    action: "match.status",
    entity: "match",
    entityId: matchId,
    summary: `Статус матча #${matchId}: ${status}`,
  });

  invalidate(...matchWriteTags(tournament.slug, matchId));
}

/**
 * Bulk time shift — the "everything is running 30 minutes late" button.
 */
export async function shiftScheduleAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();

  const parsed = parseForm(shiftScheduleSchema, formData);
  if (parsed.state) return parsed.state;

  const input = parsed.data;
  if (input.minutes === 0) return fail("Укажите сдвиг в минутах");

  const tournament = await loadTournament(input.tournament_id);
  const client = writeClient();

  let query = client
    .from("matches")
    .select("id, scheduled_at, status")
    .eq("tournament_id", input.tournament_id)
    .not("scheduled_at", "is", null);

  if (input.stage_id) query = query.eq("stage_id", input.stage_id);
  if (input.only_unplayed) query = query.in("status", ["scheduled", "live"]);

  const result = await query;
  if (result.error) return fail(result.error.message);

  const matches = result.data as Pick<Match, "id" | "scheduled_at">[];
  if (matches.length === 0) return fail("Нет матчей с назначенным временем");

  const updates = matches.map((match) => {
    const shifted = new Date(
      new Date(match.scheduled_at!).getTime() + input.minutes * 60_000,
    ).toISOString();

    return client.from("matches").update({ scheduled_at: shifted }).eq("id", match.id);
  });

  const results = await Promise.all(updates);
  const firstError = results.find((item) => item.error)?.error;
  if (firstError) return fail(firstError.message);

  await audit({
    action: "schedule.shift",
    entity: "tournament",
    entityId: input.tournament_id,
    summary: `Расписание сдвинуто на ${input.minutes} мин, матчей: ${matches.length}`,
  });

  invalidate(tags.matches(tournament.slug), tags.structure(tournament.slug));

  return done(
    `Сдвинуто матчей: ${matches.length} на ${input.minutes > 0 ? "+" : ""}${input.minutes} мин.`,
  );
}
