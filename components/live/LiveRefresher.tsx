"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/browser";

/**
 * Keeps a page fresh while a tournament is running.
 *
 * Subscribes to this tournament's matches and refreshes the router
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
  useEffect(() => {
    if (!enabled) return;
    let connected = false;
    let pending: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (document.visibilityState !== "visible" || pending) return;
      // One game write can also advance several bracket matches. Batch the
      // resulting notifications into a single server render.
      pending = setTimeout(() => {
        pending = undefined;
        if (document.visibilityState === "visible") router.refresh();
      }, 350);
    };
    const client = browserClient();
    const channel = client
      ? client
          .channel(`tournament-${tournamentId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "matches",
              filter: `tournament_id=eq.${tournamentId}`,
            },
            refresh,
          )
          // games_recalc updates the parent match for every game mutation, so a
          // global games subscription duplicated updates and included other cups.
          .subscribe((status) => {
            const wasConnected = connected;
            connected = status === "SUBSCRIBED";
            if (connected && !wasConnected) refresh();
          })
      : null;
    const timer = setInterval(() => {
      if (!connected) refresh();
    }, pollSeconds * 1000);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      if (client && channel) void client.removeChannel(channel);
      clearInterval(timer);
      clearTimeout(pending);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [enabled, pollSeconds, router, tournamentId]);

  return null;
}
