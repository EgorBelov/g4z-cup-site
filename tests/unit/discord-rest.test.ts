import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DiscordError, discord } from "@/lib/discord/rest";

const GUILD = "1291787278045413468";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("discord rest client", () => {
  beforeEach(() => {
    process.env.DISCORD_CLIENT_ID = "1571215154102800514";
    process.env.DISCORD_CLIENT_SECRET = "client-secret";
    process.env.DISCORD_BOT_TOKEN = "bot-token";
    process.env.DISCORD_GUILD_ID = GUILD;
    process.env.DISCORD_TEAMS_CATEGORY_ID = "1291787278489882644";
    process.env.DISCORD_ROLE_CAPTAIN_ID = "1331748328991363164";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends the bot token and hits the v10 API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ id: GUILD, name: "G4Z" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(discord.guild()).resolves.toMatchObject({ id: GUILD });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`https://discord.com/api/v10/guilds/${GUILD}`);
    expect(init.headers.Authorization).toBe("Bot bot-token");
  });

  it("turns a 404 into a typed error that means Â«already deletedÂ»", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(json({ message: "Unknown Channel", code: 10003 }, 404)),
    );

    const error = await discord.channel("1331748328991363164").catch((cause) => cause);
    expect(error).toBeInstanceOf(DiscordError);
    expect((error as DiscordError).status).toBe(404);
    expect((error as DiscordError).notFound).toBe(true);
    expect((error as DiscordError).code).toBe(10003);
  });

  it("retries once after a 429 and respects retry_after", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ retry_after: 0.01, message: "rate limited" }, 429))
      .mockResolvedValueOnce(
        json([{ id: "1331748328991363164", name: "ÐšÐ°Ð¿Ð¸Ñ‚Ð°Ð½" }]),
      );
    vi.stubGlobal("fetch", fetchMock);

    const roles = await discord.roles();
    expect(roles).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after three rate-limited attempts", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(json({ retry_after: 0.01, message: "rate limited" }, 429));
    vi.stubGlobal("fetch", fetchMock);

    await expect(discord.roles()).rejects.toBeInstanceOf(DiscordError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("retries a 5xx once", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ message: "server error" }, 502))
      .mockResolvedValueOnce(json({ id: GUILD, name: "G4Z" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(discord.guild()).resolves.toMatchObject({ name: "G4Z" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns undefined for 204 responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );
    await expect(discord.removeRole("1", "2")).resolves.toBeUndefined();
  });

  it("posts role payloads with safe defaults", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(json({ id: "1331748328991363164", name: "Team" }));
    vi.stubGlobal("fetch", fetchMock);

    await discord.createRole({ name: "Team", color: 0xd0df97 });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      name: "Team",
      color: 0xd0df97,
      permissions: "0",
      mentionable: false,
      hoist: false,
    });
  });

  it("adds a member with the guilds.join access token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await discord.addMember("1291787278045413468", "user-access-token");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(
      `https://discord.com/api/v10/guilds/${GUILD}/members/1291787278045413468`,
    );
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ access_token: "user-access-token" });
  });
});
