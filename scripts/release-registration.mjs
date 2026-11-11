#!/usr/bin/env node
// Project-specific rollout. Credentials are read locally and never logged.
import { readFileSync, readdirSync } from "node:fs";
for (const file of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}
const mode = process.argv[2] || "--inspect";
if (!["--inspect", "--validate", "--apply", "--launch-cup13"].includes(mode))
  throw new Error("Use --inspect / --validate / --apply / --launch-cup13");
if (!process.env.SUPABASE_ACCESS_TOKEN || !process.env.NEXT_PUBLIC_SUPABASE_URL)
  throw new Error("Supabase credentials are missing locally");
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const endpoint = `https://api.supabase.com/v1/projects/${ref}/database/query`;
async function sql(query, read_only = true) {
  const r = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, read_only }),
    signal: AbortSignal.timeout(45000),
  });
  if (!r.ok) throw new Error(`Supabase database API: HTTP ${r.status}`);
  return r.json();
}
const literal = (s) => "'" + s.replaceAll("'", "''") + "'";
try {
  const history = await sql(
    "select version from supabase_migrations.schema_migrations order by version",
  );
  if (!history.some((r) => r.version === "0010"))
    throw new Error("Expected roster migration 0010 before registration rollout");
  const pending = readdirSync("supabase/migrations")
    .filter(
      (f) =>
        /^001[1-4]_.*\.sql$/.test(f) &&
        !history.some((r) => r.version === f.slice(0, 4)),
    )
    .sort();
  console.log("Project:", ref, "Pending migrations:", pending.join(", ") || "none");
  if (mode === "--inspect") {
    console.log(
      "Registration schema:",
      await sql(
        "select to_regclass('public.player_profiles') is not null as profiles_ready, to_regclass('public.registration_teams') is not null as applications_ready",
      ),
    );
  } else if (mode === "--validate" || mode === "--apply") {
    if (pending.length) {
      let query = "begin;\n";
      for (const file of pending) {
        const body = readFileSync(`supabase/migrations/${file}`, "utf8");
        query += body + "\n";
        if (mode === "--apply")
          query += `insert into supabase_migrations.schema_migrations(version,name,statements)values(${literal(file.slice(0, 4))},${literal(file.slice(5, -4))},array[${literal(body)}]);\n`;
      }
      query +=
        mode === "--apply" ? "notify pgrst, 'reload schema';commit;" : "rollback;";
      await sql(query, false);
    }
    console.log(
      mode === "--apply"
        ? "Migrations applied and recorded"
        : "Migrations validated and rolled back",
    );
  } else {
    if (pending.length)
      throw new Error("Apply registration migrations before launching the tournament");
    await sql(readFileSync("supabase/data/g4z-cup-13.sql", "utf8"), false);
    console.log(
      "Tournament:",
      await sql(
        "select slug,name,game,status,is_current,registration_open,roster_size,max_substitutes from public.tournaments where slug='g4z-cup-13'",
      ),
    );
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
