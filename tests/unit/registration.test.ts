import { describe, it, expect } from "vitest";
import { sealAuthFlow, openAuthFlow, AUTH_FLOW_TTL } from "@/lib/auth/flow";
import { profileSchema, registrationCommandSchema } from "@/lib/validation/schemas";
import { normalizeProfileUrl, safePlayerReturn } from "@/lib/validation/profile";

const secret = "unit-test-flow-secret-01234567890123456789";
const profile = {
  nickname: "Игрок",
  telegram_username: "@contact_player",
  steam_url: "https://steamcommunity.com/id/Player_Name/?tracking=yes",
};
describe("registration input and privacy", () => {
  it("requires nickname, contact and Steam, while ratings remain optional", () => {
    const p = profileSchema.parse(profile);
    expect(p).toMatchObject({
      nickname: "Игрок",
      telegram_username: "contact_player",
      steam_url: "https://steamcommunity.com/id/player_name",
      dota_mmr: null,
      cs_elo: null,
      faceit_url: null,
      dotabuff_url: null,
    });
    for (const field of ["nickname", "telegram_username", "steam_url"]) {
      expect(profileSchema.safeParse({ ...profile, [field]: "" }).success).toBe(false);
    }
  });
  it("keeps Dota MMR and CS2 Elo separate and treats whitespace as missing", () => {
    expect(
      profileSchema.parse({ ...profile, dota_mmr: "  ", cs_elo: "1900" }),
    ).toMatchObject({ dota_mmr: null, cs_elo: 1900 });
    for (const value of ["-1", "20001", "3.5", "abc"])
      expect(profileSchema.safeParse({ ...profile, dota_mmr: value }).success).toBe(
        false,
      );
  });
  it("rejects foreign domains, credentials, misleading hosts and malformed identifiers", () => {
    for (const value of [
      "https://steamcommunity.com.evil.test/id/player",
      "https://user:password@steamcommunity.com/id/player",
      "javascript:alert(1)",
      "https://steamcommunity.com:444/id/player",
      "https://steamcommunity.com/profiles/123",
    ])
      expect(() => normalizeProfileUrl(value, "steam")).toThrow();
    expect(normalizeProfileUrl("https://dotabuff.com/players/12345/", "dotabuff")).toBe(
      "https://www.dotabuff.com/players/12345",
    );
    expect(
      normalizeProfileUrl("https://faceit.com/en/players/Player/stats", "faceit"),
    ).toBe("https://www.faceit.com/en/players/Player");
  });
  it("requires operation context and review reasons and strips forged admin flags", () => {
    expect(
      registrationCommandSchema.safeParse({
        action: "member_slot",
        application_id: "1",
        profile_id: crypto.randomUUID(),
        slot: "main",
      }).success,
    ).toBe(false);
    expect(
      registrationCommandSchema.safeParse({
        action: "review",
        application_id: "1",
        version: "0",
        status: "rejected",
      }).success,
    ).toBe(false);
    const command = registrationCommandSchema.parse({
      action: "interest",
      tournament_id: "13",
      active: "true",
      p_admin: true,
      p_actor: "forged",
    });
    expect(command).not.toHaveProperty("p_admin");
    expect(command).not.toHaveProperty("p_actor");
  });
});
describe("private OAuth draft", () => {
  it("encrypts and authenticates the form without putting contacts into a URL", () => {
    const input = {
      purpose: "register" as const,
      origin: "https://g4z-cup.ru",
      next: "/t/g4z-cup-13/register",
      profile: profileSchema.parse(profile),
    };
    const cookie = sealAuthFlow(input, secret, 1000);
    expect(cookie).not.toContain("contact_player");
    expect(cookie).not.toContain("steamcommunity");
    expect(openAuthFlow(cookie, secret, 1001)).toMatchObject(input);
    expect(sealAuthFlow(input, secret, 1000)).not.toBe(cookie);
    expect(openAuthFlow(cookie, secret + "wrong", 1001)).toBeNull();
    expect(openAuthFlow(cookie.slice(0, -2) + "xx", secret, 1001)).toBeNull();
    expect(openAuthFlow(cookie, secret, 1000 + AUTH_FLOW_TTL * 1000)).toBeNull();
  });
  it("allows the invite return and rejects external, encoded and admin destinations", () => {
    const invite = `/invite/${"a".repeat(43)}`;
    expect(safePlayerReturn(invite)).toBe(invite);
    for (const path of [
      "https://evil.test",
      "//evil.test",
      "/\\evil.test",
      "/admin",
      "/%2f%2fevil.test",
      "/me\nLocation: evil",
      "/me?next=https://evil.test",
    ])
      expect(safePlayerReturn(path)).toBe("/me");
  });
});
