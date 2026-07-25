"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser client, used only to subscribe to realtime match updates so live
 * pages refresh themselves without the viewer pressing F5.
 */
let cached: SupabaseClient | null = null;

export function browserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  if (!cached) {
    cached = createClient(url, key, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 2 } },
    });
  }

  return cached;
}
