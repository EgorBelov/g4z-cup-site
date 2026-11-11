import type { User } from "@supabase/supabase-js";

export const TELEGRAM_PROVIDER = "custom:telegram";
export const TELEGRAM_PROBE_PATH = "/admin/telegram";

/** Call only with a user verified by Auth getUser(), never from cookie JSON. */
export function telegramIdentity(user: User | null) {
  const identities = user?.identities?.filter(
    (identity) => identity.provider === TELEGRAM_PROVIDER,
  );
  if (identities?.length !== 1) return null;
  const identity = identities[0];
  if (!identity) return null;
  const data = identity.identity_data;
  if (!identity.id || data?.iss !== "https://oauth.telegram.org") return null;
  return {
    // identity.id is Auth's provider_id, derived from the verified OIDC sub.
    // user_metadata and usernames are editable and must never identify an account.
    subject: identity.id,
    username:
      typeof data.preferred_username === "string" ? data.preferred_username : null,
  };
}
