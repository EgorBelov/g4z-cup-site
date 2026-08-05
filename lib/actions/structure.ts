"use server";

import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/auth/guard";
import { writeClient } from "@/lib/supabase/write";
import { audit } from "@/lib/audit";
import { invalidate } from "@/lib/actions/revalidate";
import { structureWriteTags } from "@/lib/cache/tags";
import { done, fail, parseForm, type ActionState } from "@/lib/actions/state";
import {
  autoSeedSchema,
  deleteEntitySchema,
  generateStageSchema,
  groupSchema,
  stageSchema,
  swissRoundSchema,
} from "@/lib/validation/schemas";
import { fromDateTimeLocal } from "@/lib/format/date";
import {
  BracketError,
  generateDoubleElimination,
  generateRoundRobin,
  generateSingleElimination,
  pairKey,
  pairSwissRound,
  scheduleTimes,
  type GeneratedMatch,
  type SlotSource,
  type SwissEntry,
} from "@/lib/brackets";
import type { Match, StandingRow, Stage, Team, Tournament } from "@/lib/types/database";

type TournamentRef = Pick<Tournament, "id" | "slug" | "time_zone" | "name">;

async function loadTournament(id: number): Promise<TournamentRef> {
  const { data, error } = await writeClient()
    .from("tournaments")
    .select("id, slug, time_zone, name")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) throw new Error("Турнир не найден");
  return data as TournamentRef;
}

async function loadStage(id: number): Promise<Stage> {
  const { data, error } = await writeClient()
    .from("stages")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) throw new Error("Этап не найден");
  return data as Stage;
}

// ─── stages ──────────────────────────────────────────────────────────────────

export async function saveStageAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();

  const parsed = parseForm(stageSchema, formData);
  if (parsed.state) return parsed.state;

  const input = parsed.data;
  const tournament = await loadTournament(input.tournament_id);
  const client = writeClient();

  const row = {
    tournament_id: input.tournament_id,
    kind: input.kind,
    name: input.name,
    sort_order: input.sort_order,
    best_of: input.best_of,
    advance_count: input.advance_count,
    playin_count: input.playin_count,
    starts_on: input.starts_on,
    ends_on: input.ends_on,
  };

  if (input.stage_id) {
    const { error } = await client.from("stages").update(row).eq("id", input.stage_id);
    if (error) return fail(`Не удалось сохранить этап: ${error.message}`);

    await audit({
      action: "stage.update",
      entity: "stage",
      entityId: input.stage_id,
      summary: `Этап ${row.name}`,
      payload: row,
    });
  } else {
    const { data, error } = await client
      .from("stages")
      .insert(row)
      .select("id")
      .single();
    if (error) return fail(`Не удалось создать этап: ${error.message}`);

    // A group-style stage is unusable without a group, so create the first one.
    if (input.kind === "round_robin" || input.kind === "swiss") {
      await client.from("groups").insert({
        tournament_id: input.tournament_id,
        stage_id: (data as { id: number }).id,
        name: "Группа A",
        sort_order: 1,
      });
    }

    await audit({
      action: "stage.create",
      entity: "stage",
      entityId: (data as { id: number }).id,
      summary: `Создан этап ${row.name}`,
      payload: row,
    });
  }

  invalidate(...structureWriteTags(tournament.slug));
  redirect(`/admin/t/${tournament.slug}/structure`);
}

export async function deleteStageAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const parsed = parseForm(deleteEntitySchema, formData);
  if (parsed.state) throw new Error(parsed.state.error ?? "Некорректный запрос");

  const tournament = await loadTournament(parsed.data.tournament_id);

  const { error } = await writeClient()
    .from("stages")
    .delete()
    .eq("id", parsed.data.id);
  if (error) throw new Error(`Не удалось удалить этап: ${error.message}`);

  await audit({
    action: "stage.delete",
    entity: "stage",
    entityId: parsed.data.id,
    summary: "Этап удалён вместе с матчами",
  });

  invalidate(...structureWriteTags(tournament.slug));
  redirect(`/admin/t/${tournament.slug}/structure`);
}

// ─── groups ──────────────────────────────────────────────────────────────────

export async function saveGroupAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();

  const parsed = parseForm(groupSchema, formData);
  if (parsed.state) return parsed.state;

  const input = parsed.data;
  const tournament = await loadTournament(input.tournament_id);
  const client = writeClient();

  const row = {
    tournament_id: input.tournament_id,
    stage_id: input.stage_id,
    name: input.name,
    sort_order: input.sort_order,
  };

  const result = input.group_id
    ? await client.from("groups").update(row).eq("id", input.group_id)
    : await client.from("groups").insert(row);

  if (result.error) return fail(`Не удалось сохранить группу: ${result.error.message}`);

  await audit({
    action: input.group_id ? "group.update" : "group.create",
    entity: "group",
    entityId: input.group_id,
    summary: `Группа ${row.name}`,
  });

  invalidate(...structureWriteTags(tournament.slug));
  return done("Группа сохранена");
}

export async function deleteGroupAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const parsed = parseForm(deleteEntitySchema, formData);
  if (parsed.state) throw new Error(parsed.state.error ?? "Некорректный запрос");

  const tournament = await loadTournament(parsed.data.tournament_id);

  const { error } = await writeClient()
    .from("groups")
    .delete()
    .eq("id", parsed.data.id);
  if (error) throw new Error(`Не удалось удалить группу: ${error.message}`);

  await audit({
    action: "group.delete",
    entity: "group",
    entityId: parsed.data.id,
    summary: "Группа удалена",
  });

  invalidate(...structureWriteTags(tournament.slug));
}

/** Snake draft: spreads seeded teams across the stage's groups evenly. */
export async function autoSeedGroupsAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();

  const parsed = parseForm(autoSeedSchema, formData);
  if (parsed.state) return parsed.state;

  const tournament = await loadTournament(parsed.data.tournament_id);
  const client = writeClient();

  const [groupsResult, teamsResult] = await Promise.all([
    client
      .from("groups")
      .select("id, name, sort_order")
      .eq("stage_id", parsed.data.stage_id)
      .order("sort_order"),
    client
      .from("teams")
      .select("id, name, seed")
      .eq("tournament_id", parsed.data.tournament_id)
      .order("seed", { ascending: true, nullsFirst: false })
      .order("name"),
  ]);

  if (groupsResult.error) return fail(groupsResult.error.message);
  if (teamsResult.error) return fail(teamsResult.error.message);

  const groups = groupsResult.data as { id: number }[];
  const teams = teamsResult.data as Pick<Team, "id" | "name" | "seed">[];

  if (groups.length === 0) return fail("Сначала создайте хотя бы одну группу");
  if (teams.length === 0) return fail("В турнире нет команд");

  const assignments = teams.map((team, index) => {
    const row = Math.floor(index / groups.length);
    const withinRow = index % groups.length;
    // Snake order so seeds 1 and 2 land in different groups.
    const groupIndex = row % 2 === 0 ? withinRow : groups.length - 1 - withinRow;
    return { id: team.id, group_id: groups[groupIndex]!.id };
  });

  const results = await Promise.all(
    assignments.map((assignment) =>
      client
        .from("teams")
        .update({ group_id: assignment.group_id })
        .eq("id", assignment.id),
    ),
  );

  const firstError = results.find((result) => result.error)?.error;
  if (firstError) return fail(firstError.message);

  await audit({
    action: "groups.auto_seed",
    entity: "stage",
    entityId: parsed.data.stage_id,
    summary: `Команды (${teams.length}) распределены по ${groups.length} группам`,
  });

  invalidate(...structureWriteTags(tournament.slug));
  return done(`Распределено команд: ${teams.length}`);
}

// ─── generation ──────────────────────────────────────────────────────────────

function slotLabel(
  slot: SlotSource | null,
  specs: GeneratedMatch[],
  entrantNames: string[],
): string | null {
  if (!slot) return null;

  switch (slot.kind) {
    case "seed":
      return entrantNames[slot.seed - 1] ?? `Сеяная ${slot.seed}`;
    case "label":
      return slot.label;
    case "winner":
      return `Победитель: ${specs[slot.match]?.label ?? "матча"}`;
    case "loser":
      return `Проигравший: ${specs[slot.match]?.label ?? "матча"}`;
  }
}

/**
 * Turns a stage into real matches: round robin schedule or an elimination
 * bracket, wired so winners advance automatically.
 */
export async function generateStageAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();

  const parsed = parseForm(generateStageSchema, formData);
  if (parsed.state) return parsed.state;

  const input = parsed.data;
  const client = writeClient();
  const tournament = await loadTournament(input.tournament_id);
  const stage = await loadStage(input.stage_id);

  // ── entrants ──
  let entrants: { id: number; name: string }[] = [];

  if (stage.kind === "round_robin" || stage.kind === "swiss") {
    if (!input.group_id) return fail("Выберите группу");

    const result = await client
      .from("teams")
      .select("id, name, seed")
      .eq("group_id", input.group_id)
      .order("seed", { ascending: true, nullsFirst: false })
      .order("name");

    if (result.error) return fail(result.error.message);
    entrants = (result.data as Team[]).map((team) => ({
      id: team.id,
      name: team.name,
    }));
  } else if (input.entrant_source === "standings") {
    const result = await client
      .from("standings")
      .select("*")
      .eq("tournament_id", input.tournament_id)
      .order("group_order")
      .order("points", { ascending: false })
      .order("map_diff", { ascending: false })
      .order("maps_won", { ascending: false })
      .order("team_name");

    if (result.error) return fail(result.error.message);

    const rows = result.data as StandingRow[];
    const byGroup = new Map<number, StandingRow[]>();
    for (const row of rows) {
      byGroup.set(row.group_id, [...(byGroup.get(row.group_id) ?? []), row]);
    }

    // Interleave groups: 1st places first, then 2nd places, …
    const columns = [...byGroup.values()];
    const depth = Math.max(0, ...columns.map((column) => column.length));

    for (let position = 0; position < depth; position += 1) {
      for (const column of columns) {
        const row = column[position];
        const limit = row?.advance_count ?? null;
        if (row && (limit === null || position < limit)) {
          entrants.push({ id: row.team_id, name: row.team_name });
        }
      }
    }
  } else {
    const result = await client
      .from("teams")
      .select("id, name, seed")
      .eq("tournament_id", input.tournament_id)
      .order("seed", { ascending: true, nullsFirst: false })
      .order("name");

    if (result.error) return fail(result.error.message);
    entrants = (result.data as Team[]).map((team) => ({
      id: team.id,
      name: team.name,
    }));
  }

  if (input.entrant_limit && input.entrant_limit > 0) {
    entrants = entrants.slice(0, input.entrant_limit);
  }

  if (entrants.length < 2) {
    return fail("Нужно минимум 2 команды. Проверьте состав группы или посев.");
  }

  // An even series can end level, which leaves a bracket slot with nobody in it.
  const isBracket = stage.kind === "single_elim" || stage.kind === "double_elim";
  if (isBracket && (input.best_of % 2 === 0 || (input.final_best_of ?? 1) % 2 === 0)) {
    return fail("В плей-офф нужна нечётная серия: bo2 может закончиться вничью.");
  }

  // ── specs ──
  let specs: GeneratedMatch[];

  try {
    switch (stage.kind) {
      case "round_robin":
        specs = generateRoundRobin(entrants.length, input.best_of);
        break;
      case "swiss":
        specs = firstSwissRound(entrants.length, input.best_of);
        break;
      case "single_elim":
        specs = generateSingleElimination(entrants.length, input.best_of, {
          thirdPlace: input.third_place,
          finalBestOf: input.final_best_of ?? undefined,
        });
        break;
      case "double_elim":
        specs = generateDoubleElimination(entrants.length, input.best_of, {
          finalBestOf: input.final_best_of ?? undefined,
        });
        break;
    }
  } catch (cause) {
    if (cause instanceof BracketError) return fail(cause.message);
    throw cause;
  }

  // ── replace or refuse ──
  const existing = await client
    .from("matches")
    .select("id")
    .eq("stage_id", stage.id)
    .eq("tournament_id", input.tournament_id);

  if (existing.error) return fail(existing.error.message);
  const existingIds = (existing.data as Pick<Match, "id">[]).map((row) => row.id);

  const scopedExisting =
    stage.kind === "round_robin" || stage.kind === "swiss"
      ? await client
          .from("matches")
          .select("id")
          .eq("stage_id", stage.id)
          .eq("group_id", input.group_id!)
      : { data: existing.data, error: null };

  if (scopedExisting.error) return fail(scopedExisting.error.message);
  const toRemove = (scopedExisting.data as Pick<Match, "id">[]).map((row) => row.id);

  if (toRemove.length > 0) {
    if (!input.replace_existing) {
      return fail(
        `В этапе уже есть матчи (${toRemove.length}). Отметьте «заменить существующие», если хотите пересоздать сетку.`,
      );
    }

    const { error } = await client.from("matches").delete().in("id", toRemove);
    if (error) return fail(`Не удалось удалить старые матчи: ${error.message}`);
  }

  // ── insert ──
  const startAt = input.start_at
    ? new Date(fromDateTimeLocal(input.start_at, tournament.time_zone) ?? "")
    : null;

  const times = scheduleTimes(specs, {
    startAt: startAt && !Number.isNaN(startAt.getTime()) ? startAt : null,
    roundGapMinutes: input.round_gap_minutes,
  });

  const entrantNames = entrants.map((entrant) => entrant.name);

  const rows = specs.map((spec, index) => ({
    tournament_id: input.tournament_id,
    stage_id: stage.id,
    group_id:
      stage.kind === "round_robin" || stage.kind === "swiss" ? input.group_id : null,
    round: spec.round,
    round_label: spec.label,
    bracket: spec.bracket,
    position: spec.position,
    best_of: spec.bestOf,
    team1_id:
      spec.slot1?.kind === "seed" ? (entrants[spec.slot1.seed - 1]?.id ?? null) : null,
    team2_id:
      spec.slot2?.kind === "seed" ? (entrants[spec.slot2.seed - 1]?.id ?? null) : null,
    team1_source:
      spec.slot1?.kind === "seed" ? null : slotLabel(spec.slot1, specs, entrantNames),
    team2_source:
      spec.slot2?.kind === "seed" ? null : slotLabel(spec.slot2, specs, entrantNames),
    scheduled_at: times[index] ?? null,
    status: "scheduled" as const,
  }));

  const inserted = await client
    .from("matches")
    .insert(rows)
    .select("id, round, position, bracket");

  if (inserted.error)
    return fail(`Не удалось создать матчи: ${inserted.error.message}`);

  // Map generated specs to database ids by their unique (round, position,
  // bracket) coordinates, since insert order is not guaranteed.
  const key = (round: number, position: number, bracket: string | null) =>
    `${round}|${position}|${bracket ?? "-"}`;

  const idByKey = new Map<string, number>();
  for (const row of inserted.data as Pick<
    Match,
    "id" | "round" | "position" | "bracket"
  >[]) {
    idByKey.set(key(row.round, row.position, row.bracket), row.id);
  }

  const idOf = (spec: GeneratedMatch): number | null =>
    idByKey.get(key(spec.round, spec.position, spec.bracket)) ?? null;

  const linkUpdates = specs
    .map((spec) => {
      const id = idOf(spec);
      if (!id) return null;

      const winnerTarget = spec.winnerTo ? specs[spec.winnerTo.match] : null;
      const loserTarget = spec.loserTo ? specs[spec.loserTo.match] : null;

      const patch: Record<string, number | null> = {};
      if (winnerTarget) {
        patch.winner_to_match_id = idOf(winnerTarget);
        patch.winner_to_slot = spec.winnerTo!.slot;
      }
      if (loserTarget) {
        patch.loser_to_match_id = idOf(loserTarget);
        patch.loser_to_slot = spec.loserTo!.slot;
      }

      if (Object.keys(patch).length === 0) return null;
      return client.from("matches").update(patch).eq("id", id);
    })
    .filter((update): update is NonNullable<typeof update> => update !== null);

  const linkResults = await Promise.all(linkUpdates);
  const linkError = linkResults.find((result) => result.error)?.error;
  if (linkError)
    return fail(`Матчи созданы, но связи не сохранены: ${linkError.message}`);

  await audit({
    action: "stage.generate",
    entity: "stage",
    entityId: stage.id,
    summary: `${stage.name}: создано матчей ${rows.length} для ${entrants.length} команд${
      toRemove.length ? `, удалено старых ${toRemove.length}` : ""
    }`,
    payload: {
      entrants: entrantNames,
      replaced: toRemove.length,
      total: existingIds.length,
    },
  });

  invalidate(...structureWriteTags(tournament.slug));
  redirect(`/admin/t/${tournament.slug}/matches`);
}

/** Swiss round one is a plain seed pairing: 1–2, 3–4, … */
function firstSwissRound(teamCount: number, bestOf: number): GeneratedMatch[] {
  const matches: GeneratedMatch[] = [];

  for (let i = 0; i + 1 < teamCount; i += 2) {
    matches.push({
      index: matches.length,
      round: 1,
      position: matches.length + 1,
      bracket: null,
      label: "Швейцарка, раунд 1",
      bestOf,
      slot1: { kind: "seed", seed: i + 1 },
      slot2: { kind: "seed", seed: i + 2 },
      winnerTo: null,
      loserTo: null,
    });
  }

  return matches;
}

/**
 * Pairs the next Swiss round from current records, avoiding rematches.
 */
export async function generateSwissRoundAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();

  const parsed = parseForm(swissRoundSchema, formData);
  if (parsed.state) return parsed.state;

  const input = parsed.data;
  const client = writeClient();
  const tournament = await loadTournament(input.tournament_id);

  const [standingsResult, matchesResult] = await Promise.all([
    client
      .from("standings")
      .select("*")
      .eq("stage_id", input.stage_id)
      .eq("group_id", input.group_id),
    client
      .from("matches")
      .select("round, team1_id, team2_id, status")
      .eq("stage_id", input.stage_id)
      .eq("group_id", input.group_id),
  ]);

  if (standingsResult.error) return fail(standingsResult.error.message);
  if (matchesResult.error) return fail(matchesResult.error.message);

  const rows = standingsResult.data as StandingRow[];
  const played = matchesResult.data as Pick<
    Match,
    "round" | "team1_id" | "team2_id" | "status"
  >[];

  const unfinished = played.filter((match) => match.status !== "finished").length;
  if (unfinished > 0) {
    return fail(`Сначала завершите текущий раунд: не сыграно матчей — ${unfinished}.`);
  }

  if (rows.length < 2) return fail("В группе меньше двух команд");

  const history = new Set<string>();
  let lastRound = 0;

  for (const match of played) {
    lastRound = Math.max(lastRound, match.round);
    if (match.team1_id && match.team2_id) {
      history.add(pairKey(match.team1_id, match.team2_id));
    }
  }

  const entries: SwissEntry[] = rows.map((row) => ({
    teamId: row.team_id,
    wins: row.wins,
    losses: row.losses,
    mapDiff: row.map_diff,
  }));

  const pairing = pairSwissRound(entries, history);
  if (pairing.pairs.length === 0) {
    return fail("Не удалось составить пары — все команды уже играли между собой");
  }

  const round = lastRound + 1;
  const scheduledAt = input.start_at
    ? fromDateTimeLocal(input.start_at, tournament.time_zone)
    : null;

  const rowsToInsert = pairing.pairs.map((pair, index) => ({
    tournament_id: input.tournament_id,
    stage_id: input.stage_id,
    group_id: input.group_id,
    round,
    round_label: `Швейцарка, раунд ${round}`,
    position: index + 1,
    best_of: input.best_of,
    team1_id: pair.team1,
    team2_id: pair.team2,
    scheduled_at: scheduledAt,
    status: "scheduled" as const,
  }));

  const { error } = await client.from("matches").insert(rowsToInsert);
  if (error) return fail(`Не удалось создать раунд: ${error.message}`);

  await audit({
    action: "swiss.round",
    entity: "stage",
    entityId: input.stage_id,
    summary: `Швейцарка: раунд ${round}, матчей ${rowsToInsert.length}${
      pairing.bye ? ", одна команда отдыхает" : ""
    }${pairing.hasRematch ? " (были повторы пар)" : ""}`,
    payload: pairing,
  });

  invalidate(...structureWriteTags(tournament.slug));

  const notes = [
    `Создан раунд ${round}: матчей ${rowsToInsert.length}.`,
    pairing.bye ? "Одна команда отдыхает в этом раунде." : null,
    pairing.hasRematch ? "Внимание: пришлось допустить повторные пары." : null,
  ].filter(Boolean);

  return done(notes.join(" "));
}
