import "server-only";

import { isWriteConfigured, writeClient } from "@/lib/supabase/write";

const WINDOW_MINUTES = 15;
const MAX_FAILURES_PER_IP = 8;

export type RateLimitState = {
  blocked: boolean;
  remaining: number;
  retryAfterMinutes: number;
};

/**
 * Login throttling backed by the database rather than process memory, because
 * serverless instances do not share memory and an in-memory counter would let
 * an attacker retry indefinitely by hitting a fresh instance.
 */
export async function checkLoginRate(ip: string): Promise<RateLimitState> {
  if (!isWriteConfigured()) {
    console.warn("login throttling disabled: Supabase is not configured");
    return {
      blocked: false,
      remaining: MAX_FAILURES_PER_IP,
      retryAfterMinutes: WINDOW_MINUTES,
    };
  }

  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

  const { count, error } = await writeClient()
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .eq("succeeded", false)
    .gte("attempted_at", since);

  if (error) {
    // Fail closed on the counter, open on the login: a broken counter must not
    // lock the organiser out mid-tournament.
    console.error("login rate check failed:", error.message);
    return {
      blocked: false,
      remaining: MAX_FAILURES_PER_IP,
      retryAfterMinutes: 0,
    };
  }

  const failures = count ?? 0;

  return {
    blocked: failures >= MAX_FAILURES_PER_IP,
    remaining: Math.max(0, MAX_FAILURES_PER_IP - failures),
    retryAfterMinutes: WINDOW_MINUTES,
  };
}

export async function recordLoginAttempt(
  ip: string,
  succeeded: boolean,
): Promise<void> {
  if (!isWriteConfigured()) return;

  const { error } = await writeClient()
    .from("login_attempts")
    .insert({ ip, succeeded });

  if (error) {
    console.error("could not record login attempt:", error.message);
  }
}

/** Clears the failure counter after a successful login. */
export async function resetLoginFailures(ip: string): Promise<void> {
  if (!isWriteConfigured()) return;

  const { error } = await writeClient()
    .from("login_attempts")
    .delete()
    .eq("ip", ip)
    .eq("succeeded", false);

  if (error) {
    console.error("could not reset login failures:", error.message);
  }
}
