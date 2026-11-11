#!/usr/bin/env node
/**
 * Preflight check: is this Supabase project ready for the app?
 *
 *   npm run db:check
 *
 * Reads .env.local (or the ambient environment) and verifies, with the public
 * anon key, that every table and view the site queries is reachable. Run it
 * before deploying — a missing relation fails the Vercel build during
 * prerendering, and this tells you which migration is missing instead.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { env, exit } from "node:process";

// Minimal .env.local loader so the script works without extra dependencies.
for (const file of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (env[key]) continue;
      env[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  } catch {
    // absent file is fine
  }
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error(
    "Нужны NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY (см. .env.example).",
  );
  exit(1);
}

const client = createClient(url, anonKey, { auth: { persistSession: false } });

/** Relation → migration that creates it, for a useful failure message. */
const required = [
  ["tournaments", "0001_schema.sql"],
  ["stages", "0001_schema.sql"],
  ["groups", "0001_schema.sql"],
  ["teams", "0001_schema.sql"],
  ["players", "0001_schema.sql"],
  ["matches", "0001_schema.sql"],
  ["games", "0001_schema.sql"],
  ["game_picks", "0001_schema.sql"],
  ["game_bans", "0001_schema.sql"],
  ["placements", "0001_schema.sql"],
  ["awards", "0001_schema.sql"],
  ["heroes", "0005_heroes.sql"],
  ["match_details", "0003_views.sql"],
  ["standings", "0003_views.sql"],
  ["tournament_summaries", "0003_views.sql"],
  ["disciplines", "0012_registration_schema.sql"],
];

const isNetworkError = (message) =>
  /fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network/i.test(message);

// Connectivity first, so an unreachable project is not reported as a missing
// migration.
const probe = await client.from("tournaments").select("*", { head: true });

if (probe.error && isNetworkError(probe.error.message)) {
  console.error(`Не удалось подключиться к ${url}`);
  console.error(`  ${probe.error.message}`);
  console.error(
    "Проверьте NEXT_PUBLIC_SUPABASE_URL, доступность проекта и сеть — до миграций дело не дошло.",
  );
  exit(1);
}

const problems = [];

for (const [relation, migration] of required) {
  const { error } = await client
    .from(relation)
    .select(
      relation === "players"
        ? "id,team_id,nickname,role,is_captain,is_standin,sort_order,mmr,elo"
        : relation === "tournaments" || relation === "tournament_summaries"
          ? "id,discipline,registration_open,roster_size,max_substitutes"
          : "*",
      { head: true, count: "exact" },
    );

  if (error) {
    problems.push({ relation, migration, message: error.message });
    console.log(`✗ ${relation.padEnd(22)} ${error.message}`);
  } else {
    console.log(`✓ ${relation}`);
  }
}

// A denied query proves more than an empty table. Include private columns of
// published snapshots: hiding them only in the UI would leave REST readable.
for (const [relation, columns, migration] of [
  ["audit_log", "id", "0004_rls.sql"],
  ["login_attempts", "id", "0004_rls.sql"],
  ["players", "steam_url", "0011_player_privacy.sql"],
  ["players", "dotabuff_url", "0011_player_privacy.sql"],
  ["players", "real_name", "0011_player_privacy.sql"],
  ["players", "profile_id", "0012_registration_schema.sql"],
  ...[
    "player_profiles",
    "community_teams",
    "registration_teams",
    "team_members",
    "team_invites",
    "captain_requests",
    "registration_revisions",
    "registration_events",
  ].map((table) => [table, "id", "0012_registration_schema.sql"]),
  ...["player_ratings", "participation_interests"].map((table) => [
    table,
    "profile_id",
    "0012_registration_schema.sql",
  ]),
  ["registration_limits", "key", "0012_registration_schema.sql"],
]) {
  const { error } = await client.from(relation).select(columns).limit(1);
  const label = `${relation}.${columns}`;
  if (error?.code !== "42501") {
    problems.push({
      relation: label,
      migration,
      message: error?.message ?? "запрос не запрещён публичной роли",
    });
    console.log(`✗ ${label}: запрет доступа не подтверждён`);
  } else {
    console.log(`✓ ${label} закрыто для публичного ключа`);
  }
}

// A null match id cannot select or mutate a row. This probes the installed
// lifecycle function and its grants without starting/cancelling a real match.
if (env.SUPABASE_SERVICE_ROLE_KEY) {
  const service = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const input = { p_match_id: null, p_status: "scheduled" };
  const { error } = await service.rpc("set_match_lifecycle", input);
  if (error?.code !== "P0002") {
    problems.push({
      relation: "set_match_lifecycle",
      migration: "0009_match_lifecycle.sql",
      message: error?.message ?? "ожидался отказ для отсутствующего матча",
    });
    console.log(`✗ set_match_lifecycle: ${error?.message ?? "неожиданный ответ"}`);
  } else {
    console.log("✓ set_match_lifecycle доступна серверу");
  }
  const { error: publicError } = await client.rpc("set_match_lifecycle", input);
  if (!["42501", "PGRST202"].includes(publicError?.code ?? "")) {
    problems.push({
      relation: "set_match_lifecycle privileges",
      migration: "0009_match_lifecycle.sql",
      message: "не подтверждён запрет вызова публичным ключом",
    });
    console.log("✗ set_match_lifecycle: не подтверждён запрет публичного вызова");
  } else {
    console.log("✓ set_match_lifecycle закрыта для публичного ключа");
  }
  const rosterInput = { p_team_id: null, p_expected_version: 0, p_players: [] };
  const { error: rosterError } = await service.rpc("save_roster", rosterInput);
  const { error: rosterPublicError } = await client.rpc("save_roster", rosterInput);
  if (
    rosterError?.code !== "P0002" ||
    !["42501", "PGRST202"].includes(rosterPublicError?.code ?? "")
  ) {
    problems.push({
      relation: "save_roster",
      migration: "0010_roster_identity.sql",
      message: "не подтверждены функция сохранения состава и её права",
    });
    console.log("✗ save_roster: функция или права не готовы");
  } else {
    console.log("✓ save_roster доступна только серверу");
  }
  const { error: versionError } = await service
    .from("teams")
    .select("roster_version")
    .limit(1);
  const registrationInput = {
    p_actor: null,
    p_admin: false,
    p_action: "preflight",
    p_input: {},
    p_ip: null,
  };
  const [registrationService, registrationPublic, profileAccess] = await Promise.all([
    service.rpc("registration_command", registrationInput),
    client.rpc("registration_command", registrationInput),
    service.from("player_profiles").select("id").limit(0),
  ]);
  if (
    registrationService.error?.message !== "Требуется аккаунт игрока" ||
    !["42501", "PGRST202"].includes(registrationPublic.error?.code ?? "") ||
    profileAccess.error
  ) {
    problems.push({
      relation: "registration commands",
      migration: "0013_registration_commands.sql",
      message: "Не подтверждены команды и приватные права service role",
    });
    console.log("✗ registration commands: функции или права не готовы");
  } else
    console.log(
      "✓ registration commands доступны только серверу; неверный actor отклоняется без записи",
    );
  if (versionError)
    problems.push({
      relation: "teams.roster_version",
      migration: "0010_roster_identity.sql",
      message: versionError.message,
    });
}
const community = await client.rpc("public_community_team", {
  p_slug: "nonexistent-registration-preflight",
});
if (community.error)
  problems.push({
    relation: "public_community_team",
    migration: "0013_registration_commands.sql",
    message: community.error.message,
  });
else console.log("✓ безопасная публичная проекция команды доступна");

const { data: tournaments, error: listError } = await client
  .from("tournaments")
  .select("slug, status, is_current")
  .order("slug");

if (!listError) {
  console.log(`\nТурниров видно публично: ${tournaments?.length ?? 0}`);
  for (const row of tournaments ?? []) {
    console.log(`  ${row.slug} — ${row.status}${row.is_current ? " (текущий)" : ""}`);
  }
  if ((tournaments?.length ?? 0) === 0) {
    console.log(
      "  Пусто. Это нормально для чистой базы: примените supabase/data/g4z-cup-10.sql\n" +
        "  или создайте турнир в админке (черновик публично не виден).",
    );
  }
}

if (problems.length > 0) {
  const migrations = [...new Set(problems.map((problem) => problem.migration))].sort();
  console.error(
    `\nНе хватает ${problems.length} объектов. Примените миграции: ${migrations.join(", ")}`,
  );
  console.error(
    "Через Supabase CLI: supabase db push. Или вручную: SQL Editor → содержимое supabase/migrations/*.sql по порядку.",
  );
  exit(1);
}

console.log("\nБаза готова к деплою.");
