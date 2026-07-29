"use server";

import { assertAdmin } from "@/lib/auth/guard";
import { writeClient } from "@/lib/supabase/write";
import { audit } from "@/lib/audit";
import { invalidate } from "@/lib/actions/revalidate";
import { structureWriteTags, tags } from "@/lib/cache/tags";
import { done, fail, parseForm, type ActionState } from "@/lib/actions/state";
import { bulkTeamsSchema, finishedMatchSchema } from "@/lib/validation/schemas";
import { bestOfForScore, seriesMapWinners } from "@/lib/results/series";
import { BracketError } from "@/lib/brackets";
import { fromDateTimeLocal } from "@/lib/format/date";
import { slugify, uniqueSlug } from "@/lib/utils/slug";
import type { Stage, Team, Tournament } from "@/lib/types/database";

/**
 * Entering a past tournament by hand.
 *
 * Recording history should not require building a bracket: these actions take a
 * list of team names and a final score, and create the rows the rest of the app
 * expects — including the map rows that the score triggers derive from.
 */

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

/** Adds teams from a newline-separated list — one paste instead of one form each. */
export async function addTeamsBulkAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();

  const parsed = parseForm(bulkTeamsSchema, formData);
  if (parsed.state) return parsed.state;

  const { tournament_id: tournamentId, group_id: groupId, names } = parsed.data;
  const tournament = await loadTournament(tournamentId);
  const client = writeClient();

  const wanted = names
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (wanted.length === 0) return fail("Список пуст");

  const existing = await client
    .from("teams")
    .select("slug, name")
    .eq("tournament_id", tournamentId);

  if (existing.error) return fail(existing.error.message);

  const existingRows = existing.data as Pick<Team, "slug" | "name">[];
  const takenSlugs = existingRows.map((team) => team.slug);
  const takenNames = new Set(
    existingRows.map((team) => team.name.trim().toLowerCase()),
  );

  const rows: {
    tournament_id: number;
    slug: string;
    name: string;
    group_id: number | null;
  }[] = [];
  const skipped: string[] = [];

  for (const name of wanted) {
    if (takenNames.has(name.toLowerCase())) {
      skipped.push(name);
      continue;
    }

    const slug = uniqueSlug(slugify(name), takenSlugs);
    takenSlugs.push(slug);
    takenNames.add(name.toLowerCase());

    rows.push({ tournament_id: tournamentId, slug, name, group_id: groupId });
  }

  if (rows.length === 0) {
    return fail("Все эти команды уже заведены");
  }

  const { error } = await client.from("teams").insert(rows);
  if (error) return fail(`Не удалось создать команды: ${error.message}`);

  await audit({
    action: "teams.bulk_create",
    entity: "tournament",
    entityId: tournamentId,
    summary: `Добавлено команд: ${rows.length}`,
    payload: rows.map((row) => row.name),
  });

  invalidate(...structureWriteTags(tournament.slug));

  return done(
    `Добавлено команд: ${rows.length}.${
      skipped.length ? ` Пропущено (уже были): ${skipped.join(", ")}.` : ""
    }`,
  );
}

/**
 * Records a series that has already been played: creates the match and the maps
 * that add up to the entered score, so `recalc_match` produces exactly that
 * score, marks it finished and advances any bracket links.
 */
export async function addFinishedMatchAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();

  const parsed = parseForm(finishedMatchSchema, formData);
  if (parsed.state) return parsed.state;

  const input = parsed.data;

  if (input.team1_id === input.team2_id) {
    return fail("Выберите две разные команды");
  }

  let bestOf: number;
  let maps: ("team1" | "team2")[];

  try {
    bestOf = bestOfForScore(input.score1, input.score2);
    maps = seriesMapWinners(input.score1, input.score2);
  } catch (cause) {
    if (cause instanceof BracketError) return fail(cause.message);
    throw cause;
  }

  const tournament = await loadTournament(input.tournament_id);
  const client = writeClient();

  // A historical record does not need a full bracket, but a match must belong to
  // a stage — create a playoff stage on first use.
  let stageId = input.stage_id;

  if (!stageId) {
    const stages = await client
      .from("stages")
      .select("id, kind, sort_order")
      .eq("tournament_id", input.tournament_id)
      .order("sort_order");

    if (stages.error) return fail(stages.error.message);

    const rows = stages.data as Pick<Stage, "id" | "kind" | "sort_order">[];
    const playoff = rows.find(
      (stage) => stage.kind === "single_elim" || stage.kind === "double_elim",
    );

    if (playoff) {
      stageId = playoff.id;
    } else {
      const created = await client
        .from("stages")
        .insert({
          tournament_id: input.tournament_id,
          kind: "single_elim",
          name: "Плей-офф",
          sort_order: (rows.at(-1)?.sort_order ?? 0) + 1,
          best_of: bestOf,
        })
        .select("id")
        .single();

      if (created.error)
        return fail(`Не удалось создать этап: ${created.error.message}`);
      stageId = (created.data as { id: number }).id;
    }
  }

  const position = await nextPosition(stageId);

  const match = await client
    .from("matches")
    .insert({
      tournament_id: input.tournament_id,
      stage_id: stageId,
      round: 1,
      round_label: input.round_label,
      bracket: "final",
      position,
      best_of: bestOf,
      team1_id: input.team1_id,
      team2_id: input.team2_id,
      scheduled_at: input.played_at
        ? fromDateTimeLocal(input.played_at, tournament.time_zone)
        : null,
      vod_url: input.vod_url,
    })
    .select("id")
    .single();

  if (match.error) return fail(`Не удалось создать матч: ${match.error.message}`);

  const matchId = (match.data as { id: number }).id;

  const games = maps.map((side, index) => ({
    match_id: matchId,
    game_number: index + 1,
    winner_id: side === "team1" ? input.team1_id : input.team2_id,
  }));

  const inserted = await client.from("games").insert(games);

  if (inserted.error) {
    // Leave nothing half-written: without maps the match would sit at 0:0.
    await client.from("matches").delete().eq("id", matchId);
    return fail(`Не удалось записать карты: ${inserted.error.message}`);
  }

  await audit({
    action: "match.history",
    entity: "match",
    entityId: matchId,
    summary: `Внесён сыгранный матч «${input.round_label}» — ${input.score1}:${input.score2}`,
    payload: { ...input, bestOf },
  });

  invalidate(
    tags.matches(tournament.slug),
    tags.match(matchId),
    tags.structure(tournament.slug),
    tags.results(tournament.slug),
  );

  return done(
    `Матч «${input.round_label}» записан со счётом ${input.score1}:${input.score2} (bo${bestOf}).`,
  );
}

async function nextPosition(stageId: number): Promise<number> {
  const { data, error } = await writeClient()
    .from("matches")
    .select("position")
    .eq("stage_id", stageId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return 1;
  return ((data as { position: number } | null)?.position ?? 0) + 1;
}
