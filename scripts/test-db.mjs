#!/usr/bin/env node
// Disposable PostgreSQL in WASM: the same SQL assertions as CI, without Docker
// or credentials. This never connects to the configured Supabase project.
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";

const db = await PGlite.create();
try {
  await db.exec(
    "create role anon; create role authenticated; create role service_role bypassrls;",
  );
  await db.exec("create schema auth; create table auth.users(id uuid primary key);");
  // Mirror Supabase's service-role defaults; plain CI also tests grants below.
  await db.exec(`
    grant usage on schema public to service_role;
    alter default privileges in schema public grant all on tables to service_role;
    alter default privileges in schema public grant all on sequences to service_role;
  `);
  for (const file of readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
    console.log(`✓ ${file}`);
  }
  for (const file of [
    "supabase/seed.sql",
    "supabase/data/g4z-cup-10.sql",
    "supabase/tests/logic.sql",
  ]) {
    // psql's ON_ERROR_STOP meta-command is unnecessary: exec rejects on error.
    const sql = readFileSync(file, "utf8").replace(/^\\set ON_ERROR_STOP on\s*$/m, "");
    await db.exec(sql);
    console.log(`✓ ${file}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await db.close();
}
