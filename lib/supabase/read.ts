import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Read client for public pages. Uses the anon key, which RLS restricts to
 * SELECT on published tournaments — there are no write policies, so this key
 * cannot change anything even if it leaks.
 */
let cached: SupabaseClient | null = null;

/**
 * Whether Supabase credentials are present. Lets a build (or a CI run) without
 * secrets finish instead of failing while prerendering, while a misconfigured
 * production deploy still surfaces the missing variable.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function readClient(): SupabaseClient {
  if (!cached) {
    cached = createClient(supabaseUrl(), supabaseAnonKey(), {
      auth: { persistSession: false },
    });
  }
  return cached;
}

/**
 * Turns a Supabase error into something actionable.
 *
 * A missing relation almost always means the migrations have not been applied to
 * this project — the message says so instead of leaving a bare PostgREST error
 * in the build log.
 */
export function describeError(message: string): string {
  if (
    /could not find the (table|relation)|does not exist|schema cache/i.test(message)
  ) {
    return `${message} — похоже, миграции не применены к этому проекту Supabase. Примените supabase/migrations/*.sql (см. README, раздел «Деплой») и повторите.`;
  }

  if (/permission denied/i.test(message)) {
    return `${message} — роли anon не выданы права на чтение. Примените supabase/migrations/0006_grants.sql.`;
  }

  return message;
}

/** Throws with the query name attached, so failures are traceable in logs. */
export function unwrap<T>(
  result: { data: T | null; error: { message: string } | null },
  what: string,
): T {
  if (result.error) {
    throw new Error(`${what}: ${describeError(result.error.message)}`);
  }
  if (result.data === null) {
    throw new Error(`${what}: no data returned`);
  }
  return result.data;
}
