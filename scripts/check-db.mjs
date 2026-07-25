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
    .select("*", { head: true, count: "exact" });

  if (error) {
    problems.push({ relation, migration, message: error.message });
    console.log(`✗ ${relation.padEnd(22)} ${error.message}`);
  } else {
    console.log(`✓ ${relation}`);
  }
}

// The operational tables must NOT be readable with the anon key.
for (const relation of ["audit_log", "login_attempts"]) {
  const { data, error } = await client.from(relation).select("id").limit(1);

  if (error && isNetworkError(error.message)) {
    console.log(`? ${relation.padEnd(22)} проверить не удалось: ${error.message}`);
    continue;
  }

  if (!error && data && data.length > 0) {
    problems.push({
      relation,
      migration: "0004_rls.sql",
      message: "таблица читается публичным ключом — RLS или права не применены",
    });
    console.log(`✗ ${relation.padEnd(22)} доступна анонимно, чего быть не должно`);
  } else {
    console.log(`✓ ${relation} закрыта для публичного ключа`);
  }
}

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
