import "server-only";

import { isWriteConfigured, writeClient } from "@/lib/supabase/write";
import { requestIp } from "@/lib/auth/guard";

/**
 * Every admin mutation is recorded. With a shared organiser password there is no
 * "who", but there is always a "what changed and when" — enough to see how a
 * score got wrong mid-tournament and to put it back.
 */
export async function audit(entry: {
  action: string;
  entity: string;
  entityId?: number | null;
  summary?: string;
  payload?: unknown;
}): Promise<void> {
  if (!isWriteConfigured()) return;

  try {
    const ip = await requestIp();

    const { error } = await writeClient()
      .from("audit_log")
      .insert({
        action: entry.action,
        entity: entry.entity,
        entity_id: entry.entityId ?? null,
        summary: entry.summary ?? null,
        payload: entry.payload ? JSON.parse(JSON.stringify(entry.payload)) : null,
        ip,
      });

    if (error) console.error("audit write failed:", error.message);
  } catch (cause) {
    // Auditing must never break the mutation it is recording.
    console.error("audit write threw:", cause);
  }
}
