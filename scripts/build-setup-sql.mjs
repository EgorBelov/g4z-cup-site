#!/usr/bin/env node
/**
 * Concatenates the migrations (and optionally the archive data) into a single
 * file that can be pasted into the Supabase SQL Editor in one go.
 *
 *   node scripts/build-setup-sql.mjs           # writes supabase/setup.sql
 *   node scripts/build-setup-sql.mjs --check   # fails if it is out of date
 *
 * The generated file is committed so that setting up a project needs no tooling,
 * and CI runs --check so it can never drift from the migrations.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { argv, exit } from "node:process";

const MIGRATIONS_DIR = "supabase/migrations";
const OUTPUT = "supabase/setup.sql";

const header = `-- ============================================================================
-- GENERATED FILE — do not edit.
--
-- Concatenation of ${MIGRATIONS_DIR}/*.sql, in order. Regenerate with:
--   node scripts/build-setup-sql.mjs
--
-- Paste the whole thing into the Supabase SQL Editor and run it once to set up
-- a fresh project. Afterwards, apply supabase/data/g4z-cup-10.sql for the
-- archived tenth cup.
-- ============================================================================

`;

const files = readdirSync(MIGRATIONS_DIR)
  .filter((name) => name.endsWith(".sql"))
  .sort();

const body = files
  .map((name) => {
    const contents = readFileSync(join(MIGRATIONS_DIR, name), "utf8").trimEnd();
    return `-- ─── ${name} ${"─".repeat(Math.max(0, 60 - name.length))}\n\n${contents}\n`;
  })
  .join("\n");

const output = `${header}${body}`;

if (argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(OUTPUT, "utf8");
  } catch {
    console.error(`${OUTPUT} отсутствует. Соберите: node scripts/build-setup-sql.mjs`);
    exit(1);
  }

  if (current !== output) {
    console.error(
      `${OUTPUT} устарел относительно ${MIGRATIONS_DIR}. Пересоберите: node scripts/build-setup-sql.mjs`,
    );
    exit(1);
  }

  console.log(`${OUTPUT} соответствует миграциям (${files.length} файлов).`);
  exit(0);
}

writeFileSync(OUTPUT, output);
console.log(`${OUTPUT}: собрано из ${files.length} миграций.`);
