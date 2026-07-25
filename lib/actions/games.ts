"use server";

import { assertAdmin } from "@/lib/auth/guard";
import { writeClient } from "@/lib/supabase/write";
import { audit } from "@/lib/audit";
import { invalidate } from "@/lib/actions/revalidate";
import { matchWriteTags } from "@/lib/cache/tags";
import { done, fail, parseForm, type ActionState } from "@/lib/actions/state";
import {
  draftSchema,
  gameIdSchema,
  gameSchema,
  quickWinnerSchema,
} from "@/lib/validation/schemas";
import { matchContext } from "@/lib/actions/matches";
import type { Game, GameBan, GamePick } from "@/lib/types/database";

async function nextGameNumber(matchId: number): Promise<number> {
  const { data, error } = await writeClient()
    .from("games")
    .select("game_number")
    .eq("match_id", matchId)
    .order("game_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return ((data as Pick<Game, "game_number"> | null)?.game_number ?? 0) + 1;
}

export async function addGameAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const matchId = Number(formData.get("match_id"));
  if (!Number.isInteger(matchId) || matchId <= 0) {
    throw new Error("Некорректный матч");
  }

  const tournament = await matchContext(matchId);
  const gameNumber = await nextGameNumber(matchId);

  const { error } = await writeClient()
    .from("games")
    .insert({ match_id: matchId, game_number: gameNumber });

  if (error) throw new Error(`Не удалось добавить карту: ${error.message}`);

  await audit({
    action: "game.create",
    entity: "match",
    entityId: matchId,
    summary: `Добавлена карта ${gameNumber}`,
  });

  invalidate(...matchWriteTags(tournament.slug, matchId));
}

export async function saveGameAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();

  const parsed = parseForm(gameSchema, formData);
  if (parsed.state) return parsed.state;

  const input = parsed.data;
  if (!input.game_id) return fail("Не указана карта");

  const tournament = await matchContext(input.match_id);

  const { error } = await writeClient()
    .from("games")
    .update({
      winner_id: input.winner_id,
      radiant_team_id: input.radiant_team_id,
      first_pick_team_id: input.first_pick_team_id,
      duration_seconds: input.duration_minutes ? input.duration_minutes * 60 : null,
      dota_match_id: input.dota_match_id,
      notes: input.notes,
    })
    .eq("id", input.game_id);

  if (error) return fail(`Не удалось сохранить карту: ${error.message}`);

  await audit({
    action: "game.update",
    entity: "game",
    entityId: input.game_id,
    summary: `Карта обновлена в матче #${input.match_id}`,
    payload: input,
  });

  invalidate(...matchWriteTags(tournament.slug, input.match_id));
  return done("Карта сохранена");
}

export async function deleteGameAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const parsed = parseForm(gameIdSchema, formData);
  if (parsed.state) throw new Error(parsed.state.error ?? "Некорректный запрос");

  const tournament = await matchContext(parsed.data.match_id);

  const { error } = await writeClient()
    .from("games")
    .delete()
    .eq("id", parsed.data.game_id);

  if (error) throw new Error(`Не удалось удалить карту: ${error.message}`);

  await audit({
    action: "game.delete",
    entity: "match",
    entityId: parsed.data.match_id,
    summary: `Удалена карта ${parsed.data.game_id}`,
  });

  invalidate(...matchWriteTags(tournament.slug, parsed.data.match_id));
}

/**
 * One-tap scoring for the live screen: fills the winner of the open map, or
 * starts the next one. Score, series winner and bracket progression all follow
 * from database triggers.
 */
export async function recordGameWinnerAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const parsed = parseForm(quickWinnerSchema, formData);
  if (parsed.state) throw new Error(parsed.state.error ?? "Некорректный запрос");

  const { match_id: matchId, winner_id: winnerId } = parsed.data;
  const tournament = await matchContext(matchId);
  const client = writeClient();

  const open = await client
    .from("games")
    .select("id, game_number")
    .eq("match_id", matchId)
    .is("winner_id", null)
    .order("game_number")
    .limit(1)
    .maybeSingle();

  if (open.error) throw new Error(open.error.message);

  if (open.data) {
    const game = open.data as Pick<Game, "id" | "game_number">;
    const { error } = await client
      .from("games")
      .update({ winner_id: winnerId })
      .eq("id", game.id);

    if (error) throw new Error(error.message);

    await audit({
      action: "game.winner",
      entity: "match",
      entityId: matchId,
      summary: `Карта ${game.game_number}: победитель ${winnerId}`,
    });
  } else {
    const gameNumber = await nextGameNumber(matchId);
    const { error } = await client
      .from("games")
      .insert({ match_id: matchId, game_number: gameNumber, winner_id: winnerId });

    if (error) throw new Error(error.message);

    await audit({
      action: "game.winner",
      entity: "match",
      entityId: matchId,
      summary: `Новая карта ${gameNumber}: победитель ${winnerId}`,
    });
  }

  invalidate(...matchWriteTags(tournament.slug, matchId));
}

/** Removes the most recent map — the undo button for a mis-tap. */
export async function undoLastGameAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const matchId = Number(formData.get("match_id"));
  if (!Number.isInteger(matchId) || matchId <= 0) {
    throw new Error("Некорректный матч");
  }

  const tournament = await matchContext(matchId);
  const client = writeClient();

  const last = await client
    .from("games")
    .select("id, game_number")
    .eq("match_id", matchId)
    .order("game_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (last.error) throw new Error(last.error.message);
  if (!last.data) return;

  const game = last.data as Pick<Game, "id" | "game_number">;

  const { error } = await client.from("games").delete().eq("id", game.id);
  if (error) throw new Error(error.message);

  await audit({
    action: "game.undo",
    entity: "match",
    entityId: matchId,
    summary: `Отменена карта ${game.game_number}`,
  });

  invalidate(...matchWriteTags(tournament.slug, matchId));
}

/**
 * Saves picks and bans for one map.
 *
 * Rows are replaced inside a single pair of statements per table and only after
 * the new set has been built, so a bad input can never leave a half-saved draft.
 */
export async function saveDraftAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();

  const parsed = parseForm(draftSchema, formData);
  if (parsed.state) return parsed.state;

  const input = parsed.data;
  const tournament = await matchContext(input.match_id);
  const client = writeClient();

  const picks: Omit<GamePick, "id">[] = [];
  const bans: Omit<GameBan, "id">[] = [];

  const collectPicks = (teamId: number, heroes: string[], players: string[]): void => {
    heroes.forEach((hero, index) => {
      const trimmed = hero.trim();
      if (!trimmed) return;

      picks.push({
        game_id: input.game_id,
        team_id: teamId,
        hero: trimmed,
        player_id: null,
        player_name: (players[index] ?? "").trim() || null,
        order_no: index + 1,
      });
    });
  };

  const collectBans = (teamId: number, heroes: string[]): void => {
    heroes.forEach((hero, index) => {
      const trimmed = hero.trim();
      if (!trimmed) return;

      bans.push({
        game_id: input.game_id,
        team_id: teamId,
        hero: trimmed,
        order_no: index + 1,
      });
    });
  };

  collectPicks(input.team1_id, input.team1_pick_hero, input.team1_pick_player);
  collectPicks(input.team2_id, input.team2_pick_hero, input.team2_pick_player);
  collectBans(input.team1_id, input.team1_ban_hero);
  collectBans(input.team2_id, input.team2_ban_hero);

  const clearedPicks = await client
    .from("game_picks")
    .delete()
    .eq("game_id", input.game_id);
  if (clearedPicks.error) return fail(clearedPicks.error.message);

  const clearedBans = await client
    .from("game_bans")
    .delete()
    .eq("game_id", input.game_id);
  if (clearedBans.error) return fail(clearedBans.error.message);

  if (picks.length > 0) {
    const { error } = await client.from("game_picks").insert(picks);
    if (error) return fail(`Пики не сохранены: ${error.message}`);
  }

  if (bans.length > 0) {
    const { error } = await client.from("game_bans").insert(bans);
    if (error) return fail(`Баны не сохранены: ${error.message}`);
  }

  await audit({
    action: "draft.save",
    entity: "game",
    entityId: input.game_id,
    summary: `Драфт сохранён: пиков ${picks.length}, банов ${bans.length}`,
  });

  invalidate(...matchWriteTags(tournament.slug, input.match_id));
  return done(`Драфт сохранён: пиков ${picks.length}, банов ${bans.length}`);
}
