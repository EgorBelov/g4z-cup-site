import { describe, expect, it } from "vitest";
import {
  BOT_PERMISSIONS,
  PERMISSION,
  ROLE_COLOR,
  VOICE_ALLOW,
  sanitizeName,
  teamChannelOverwrites,
} from "@/lib/discord/permissions";

const ids = {
  guildId: "1291787278045413468",
  teamRoleId: "1331748328991363164",
  captainRoleId: "1331748328991363165",
};

describe("discord permissions", () => {
  it("keeps the `@everyone` overwrite visible but not joinable", () => {
    const everyone = teamChannelOverwrites(ids).at(0);
    expect(everyone?.id).toBe(ids.guildId);
    expect(everyone?.allow).toBe(PERMISSION.VIEW_CHANNEL.toString());
    expect(everyone?.deny).toBe(PERMISSION.CONNECT.toString());
  });

  it("lets the team and the captain role join and speak", () => {
    const overwrites = teamChannelOverwrites(ids);
    const team = overwrites.at(1);
    const captain = overwrites.at(2);

    expect(team?.id).toBe(ids.teamRoleId);
    expect(captain?.id).toBe(ids.captainRoleId);
    for (const overwrite of overwrites.slice(1)) {
      expect(overwrite.type).toBe(0);
      expect(BigInt(overwrite.allow)).toBe(
        PERMISSION.VIEW_CHANNEL | PERMISSION.CONNECT | PERMISSION.SPEAK,
      );
      expect(overwrite.deny).toBe("0");
    }
  });

  it("uses decimal strings, which is what the API requires", () => {
    expect(VOICE_ALLOW).toBe((1024n | 1048576n | 2097152n).toString());
    expect(BigInt(BOT_PERMISSIONS)).toBe(
      PERMISSION.MANAGE_ROLES |
        PERMISSION.MANAGE_CHANNELS |
        PERMISSION.VIEW_CHANNEL |
        PERMISSION.CREATE_INSTANT_INVITE,
    );
  });

  it("matches the site accent for role colour", () => {
    expect(ROLE_COLOR).toBe(0xd0df97);
  });
});

describe("discord names", () => {
  it("keeps ordinary names", () => {
    expect(sanitizeName("Team Spirit")).toBe("Team Spirit");
    expect(sanitizeName("  Медведи  ")).toBe("Медведи");
  });

  it("strips control characters and collapses whitespace", () => {
    expect(sanitizeName("Team\u0000\n\tSpirit")).toBe("Team Spirit");
  });

  it("trims to Discord's 100 character limit", () => {
    expect(sanitizeName("x".repeat(200))).toHaveLength(100);
  });

  it("falls back instead of sending an empty name", () => {
    expect(sanitizeName("   ")).toBe("Команда");
    expect(sanitizeName("\u0000\u0001")).toBe("Команда");
  });
});
