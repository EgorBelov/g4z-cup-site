#!/usr/bin/env node
/**
 * Imports G4Z CUP 10 from the v1 Supabase project into the v2 schema.
 *
 *   OLD_SUPABASE_URL=... OLD_SUPABASE_KEY=... \
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/import-legacy.mjs [--tournament-slug g4z-cup-10] [--dry-run]
 *
 * The v1 schema this reads:
 *   tournaments, groups, teams, players, matches, match_games,
 *   match_game_picks, match_game_bans
 *
 * Safe to re-run: matches of the target tournament are replaced wholesale, and
 * teams are matched by name.
 */
import { createClient } from "@supabase/supabase-js";
import { argv, env, exit } from "node:process";

const args = argv.slice(2);
const dryRun = args.includes("--dry-run");
const slugArg = args.indexOf("--tournament-slug");
const targetSlug = slugArg >= 0 ? args[slugArg + 1] : "g4z-cup-10";

function required(name) {
  const value = env[name];
  if (!value) {
    console.error(`Не задана переменная окружения ${name}`);
    exit(1);
  }
  return value;
}

const legacy = createClient(
  required("OLD_SUPABASE_URL"),
  required("OLD_SUPABASE_KEY"),
  { auth: { persistSession: false } },
);

const target = createClient(
  required("NEXT_PUBLIC_SUPABASE_URL"),
  required("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false } },
);

async function pull(table, columns = "*") {
  const { data, error } = await legacy.from(table).select(columns);
  if (error) {
    console.error(`Не удалось прочитать ${table}: ${error.message}`);
    exit(1);
  }
  return data ?? [];
}

function normalise(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const { data: tournament, error: tournamentError } = await target
  .from("tournaments")
  .select("id, slug, name, time_zone")
  .eq("slug", targetSlug)
  .maybeSingle();

if (tournamentError || !tournament) {
  console.error(
    `Турнир ${targetSlug} не найден в новой базе. Сначала примените supabase/data/g4z-cup-10.sql`,
  );
  exit(1);
}

const [stages, groups, newTeams] = await Promise.all([
  target
    .from("stages")
    .select("*")
    .eq("tournament_id", tournament.id)
    .order("sort_order"),
  target
    .from("groups")
    .select("*")
    .eq("tournament_id", tournament.id)
    .order("sort_order"),
  target.from("teams").select("*").eq("tournament_id", tournament.id),
]);

const groupStage = (stages.data ?? []).find((stage) => stage.kind === "round_robin");
const playoffStage = (stages.data ?? []).find((stage) => stage.kind !== "round_robin");
const defaultGroup = (groups.data ?? [])[0];

if (!groupStage || !defaultGroup) {
  console.error("В новой базе нет группового этапа/группы для этого турнира.");
  exit(1);
}

const teamByName = new Map(
  (newTeams.data ?? []).map((team) => [normalise(team.name), team]),
);

// ─── legacy data ─────────────────────────────────────────────────────────────

const legacyTeams = await pull("teams");
const legacyPlayers = await pull("players");
const legacyMatches = await pull("matches");
const legacyGames = await pull("match_games");
const legacyPicks = await pull("match_game_picks");
const legacyBans = await pull("match_game_bans");

console.log(
  `Прочитано из v1: команд ${legacyTeams.length}, игроков ${legacyPlayers.length}, ` +
    `матчей ${legacyMatches.length}, карт ${legacyGames.length}, ` +
    `пиков ${legacyPicks.length}, банов ${legacyBans.length}`,
);

// Map legacy team ids to new team rows, creating anything that is missing.
const teamIdMap = new Map();

for (const legacyTeam of legacyTeams) {
  const key = normalise(legacyTeam.name);
  let match = teamByName.get(key);

  if (!match) {
    console.log(`+ команда «${legacyTeam.name}» отсутствовала, создаём`);

    if (!dryRun) {
      const { data, error } = await target
        .from("teams")
        .insert({
          tournament_id: tournament.id,
          slug:
            legacyTeam.slug?.replace(/^team-/, "") ??
            key.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
          name: legacyTeam.name,
          group_id: defaultGroup.id,
          description: legacyTeam.description ?? null,
        })
        .select("*")
        .single();

      if (error) {
        console.error(`  не удалось создать: ${error.message}`);
        continue;
      }
      match = data;
      teamByName.set(key, match);
    }
  }

  if (match) teamIdMap.set(legacyTeam.id, match.id);
}

// Rosters.
for (const [legacyTeamId, newTeamId] of teamIdMap) {
  const roster = legacyPlayers
    .filter((player) => player.team_id === legacyTeamId)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  if (roster.length === 0) continue;

  if (!dryRun) {
    await target.from("players").delete().eq("team_id", newTeamId);
    const { error } = await target.from("players").insert(
      roster.map((player, index) => ({
        team_id: newTeamId,
        nickname: player.nickname,
        real_name: player.real_name ?? null,
        role: player.role ?? null,
        sort_order: index + 1,
      })),
    );
    if (error) console.error(`  состав не сохранён: ${error.message}`);
  }
}

console.log(`Составы перенесены для ${teamIdMap.size} команд`);

// Matches. Replace everything for this tournament so re-runs stay clean.
if (!dryRun) {
  await target.from("matches").delete().eq("tournament_id", tournament.id);
}

const matchIdMap = new Map();

for (const legacyMatch of legacyMatches) {
  const isGroup = legacyMatch.stage === "group";
  const stageId = isGroup ? groupStage.id : (playoffStage?.id ?? groupStage.id);

  const row = {
    tournament_id: tournament.id,
    stage_id: stageId,
    group_id: isGroup ? defaultGroup.id : null,
    round: Number(String(legacyMatch.round_name ?? "").replace(/\D+/g, "")) || 1,
    round_label: legacyMatch.round_name ?? null,
    bracket: isGroup ? null : "upper",
    position: legacyMatch.match_order ?? 1,
    best_of: legacyMatch.bo === "bo5" ? 5 : legacyMatch.bo === "bo3" ? 3 : 1,
    team1_id: teamIdMap.get(legacyMatch.team1_id) ?? null,
    team2_id: teamIdMap.get(legacyMatch.team2_id) ?? null,
    scheduled_at: legacyMatch.scheduled_at ?? null,
    stream_url: legacyMatch.stream_url ?? null,
    notes: legacyMatch.notes ?? null,
    status: legacyMatch.status === "finished" ? "finished" : "scheduled",
  };

  if (dryRun) {
    matchIdMap.set(legacyMatch.id, -1);
    continue;
  }

  const { data, error } = await target
    .from("matches")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    console.error(`Матч ${legacyMatch.id} не перенесён: ${error.message}`);
    continue;
  }

  matchIdMap.set(legacyMatch.id, data.id);
}

console.log(`Перенесено матчей: ${matchIdMap.size}`);

// Games, picks and bans. Scores recompute themselves from game winners.
const gameIdMap = new Map();

for (const legacyGame of legacyGames) {
  const matchId = matchIdMap.get(legacyGame.match_id);
  if (!matchId || dryRun) continue;

  const { data, error } = await target
    .from("games")
    .insert({
      match_id: matchId,
      game_number: legacyGame.game_number,
      winner_id: teamIdMap.get(legacyGame.winner_id) ?? null,
      duration_seconds: legacyGame.duration_minutes
        ? legacyGame.duration_minutes * 60
        : null,
      notes: legacyGame.notes ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error(`Карта ${legacyGame.id} не перенесена: ${error.message}`);
    continue;
  }

  gameIdMap.set(legacyGame.id, data.id);
}

const picks = legacyPicks
  .filter((pick) => gameIdMap.has(pick.match_game_id) && teamIdMap.has(pick.team_id))
  .map((pick) => ({
    game_id: gameIdMap.get(pick.match_game_id),
    team_id: teamIdMap.get(pick.team_id),
    hero: pick.hero_name,
    player_name: pick.player_name ?? null,
    order_no: pick.pick_order ?? 1,
  }));

const bans = legacyBans
  .filter((ban) => gameIdMap.has(ban.match_game_id) && teamIdMap.has(ban.team_id))
  .map((ban) => ({
    game_id: gameIdMap.get(ban.match_game_id),
    team_id: teamIdMap.get(ban.team_id),
    hero: ban.hero_name,
    order_no: ban.ban_order ?? 1,
  }));

if (!dryRun) {
  if (picks.length > 0) {
    const { error } = await target.from("game_picks").insert(picks);
    if (error) console.error(`Пики: ${error.message}`);
  }
  if (bans.length > 0) {
    const { error } = await target.from("game_bans").insert(bans);
    if (error) console.error(`Баны: ${error.message}`);
  }
}

console.log(
  `Готово${dryRun ? " (dry run, ничего не записано)" : ""}: карт ${gameIdMap.size}, ` +
    `пиков ${picks.length}, банов ${bans.length}`,
);
console.log(
  "Проверьте /t/" +
    tournament.slug +
    " и при необходимости поправьте плей-офф вручную.",
);
