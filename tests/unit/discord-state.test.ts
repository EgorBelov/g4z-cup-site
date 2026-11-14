import { describe, expect, it } from "vitest";
import {
  DISCORD_STATE_TTL,
  discordNonce,
  openDiscordState,
  sealDiscordState,
} from "@/lib/discord/state";

const SECRET = "a".repeat(48);
const input = {
  profile: "6f9d3f8e-3f1a-4f4d-9c95-0f7a1f3f9d21",
  origin: "https://g4z-cup.ru",
  next: "/me/profile",
  nonce: "0123456789abcdef0123456789abcdef",
};

describe("discord oauth state", () => {
  it("round-trips the profile and origin", () => {
    const sealed = sealDiscordState(input, SECRET);
    expect(openDiscordState(sealed, SECRET)).toMatchObject(input);
  });

  it("rejects a state signed with another secret", () => {
    const sealed = sealDiscordState(input, SECRET);
    expect(openDiscordState(sealed, "b".repeat(48))).toBeNull();
  });

  it("rejects tampering", () => {
    const sealed = sealDiscordState(input, SECRET);
    const chars = [...sealed];
    // Flip a byte inside the ciphertext, not the last base64 digit (whose low
    // bits are padding and may decode to the same bytes).
    const at = 40;
    chars[at] = chars[at] === "A" ? "B" : "A";
    expect(openDiscordState(chars.join(""), SECRET)).toBeNull();
  });

  it("expires", () => {
    const now = Date.now();
    const sealed = sealDiscordState(input, SECRET, now);
    expect(openDiscordState(sealed, SECRET, now + 1000)).not.toBeNull();
    expect(
      openDiscordState(sealed, SECRET, now + (DISCORD_STATE_TTL + 5) * 1000),
    ).toBeNull();
  });

  it("rejects a state that is valid but issued for the future", () => {
    const now = Date.now();
    const sealed = sealDiscordState(input, SECRET, now + 60 * 60 * 1000);
    expect(openDiscordState(sealed, SECRET, now)).toBeNull();
  });

  it("issues a fresh nonce every time", () => {
    expect(discordNonce()).not.toBe(discordNonce());
    expect(discordNonce()).toHaveLength(32);
  });
});
