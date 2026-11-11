import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";
import { telegramIdentity } from "@/lib/auth/telegram";

const confirmed = {
  id: "auth-id",
  user_metadata: { sub: "forged-subject", preferred_username: "forged_username" },
  identities: [
    {
      id: "1234567890",
      identity_id: "identity-id",
      user_id: "auth-id",
      provider: "custom:telegram",
      identity_data: {
        iss: "https://oauth.telegram.org",
        preferred_username: "confirmed_name",
      },
    },
  ],
} as unknown as User;

describe("confirmed Telegram identity", () => {
  it("uses the provider identity, ignoring mutable user metadata", () => {
    expect(telegramIdentity(confirmed)).toEqual({
      subject: "1234567890",
      username: "confirmed_name",
    });
  });
  it("does not require email or a Telegram username", () => {
    const user = structuredClone(confirmed);
    delete user.identities![0]!.identity_data!.preferred_username;
    expect(telegramIdentity(user)).toEqual({ subject: "1234567890", username: null });
  });
  it("keeps the stable subject when the username changes", () => {
    const user = structuredClone(confirmed);
    user.identities![0]!.identity_data!.preferred_username = "new_username";
    expect(telegramIdentity(user)?.subject).toBe(telegramIdentity(confirmed)?.subject);
  });
  it("rejects unverified, foreign, ambiguous and missing identities", () => {
    expect(telegramIdentity(null)).toBeNull();
    expect(telegramIdentity({ ...confirmed, identities: [] })).toBeNull();
    for (const changes of [
      { provider: "github" },
      { id: "" },
      { identity_data: { iss: "https://example.com" } },
    ]) {
      expect(
        telegramIdentity({
          ...confirmed,
          identities: [{ ...confirmed.identities![0]!, ...changes }],
        }),
      ).toBeNull();
    }
    expect(
      telegramIdentity({
        ...confirmed,
        identities: [...confirmed.identities!, ...confirmed.identities!],
      }),
    ).toBeNull();
  });
});
