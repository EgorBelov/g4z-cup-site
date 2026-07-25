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

/** Throws with the query name attached, so failures are traceable in logs. */
export function unwrap<T>(
  result: { data: T | null; error: { message: string } | null },
  what: string,
): T {
  if (result.error) {
    throw new Error(`${what}: ${result.error.message}`);
  }
  if (result.data === null) {
    throw new Error(`${what}: no data returned`);
  }
  return result.data;
}
