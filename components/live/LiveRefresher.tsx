"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/browser";

/**
 * Keeps a page fresh while a tournament is running.
 *
 * Subscribes to Postgres changes on matches and games and refreshes the router
 * when something moves, so viewers never press F5. If realtime is unavailable it
 * falls back to a slow poll.
 */
export function LiveRefresher({
  tournamentId,
  enabled = true,
  pollSeconds = 60,
}: {
  tournamentId: number;
  enabled?: boolean;
  pollSeconds?: number;
}) {
  const router = useRouter();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const client = browserClient();
    if (!client) return;

    const channel = client
      .channel(`tournament-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => router.refresh(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, () =>
        router.refresh(),
      )
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => {
      void client.removeChannel(channel);
    };
  }, [enabled, router, tournamentId]);

  useEffect(() => {
    if (!enabled || connected) return;

    const timer = setInterval(() => router.refresh(), pollSeconds * 1000);
    return () => clearInterval(timer);
  }, [connected, enabled, pollSeconds, router]);

  return null;
}
