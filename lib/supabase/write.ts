import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseServiceKey, supabaseUrl } from "@/lib/env";

/**
 * Write client. Uses the service role key, bypasses RLS, and is the only way
 * anything in this app mutates data.
 *
 * `server-only` makes importing this from a client component a build error.
 */
let cached: SupabaseClient | null = null;

/** Whether write credentials are present. */
export function isWriteConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function writeClient(): SupabaseClient {
  if (!cached) {
    cached = createClient(supabaseUrl(), supabaseServiceKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
