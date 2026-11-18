import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { playerRegistrationCommandAction } from "@/lib/actions/registration";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  after: vi.fn(),
  notify: vi.fn(),
  assertPlayer: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock("@/lib/auth/player", () => ({ assertPlayer: mocks.assertPlayer }));
vi.mock("@/lib/auth/guard", () => ({
  assertAdmin: vi.fn(),
  requestIp: async () => "127.0.0.1",
}));
vi.mock("@/lib/supabase/write", () => ({ writeClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/actions/revalidate", () => ({ invalidate: mocks.invalidate }));
vi.mock("@/lib/discord/config", () => ({ discordConfigured: () => false }));
vi.mock("@/lib/discord/provision", () => ({ syncTeam: vi.fn() }));
vi.mock("@/lib/telegram/notifications", () => ({
  notifyApplicationSubmitted: mocks.notify,
}));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("next/navigation", () => ({
  redirect: () => {
    throw new Error("redirect");
  },
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "12345:token");
  vi.stubEnv("TELEGRAM_ADMIN_USERNAME", "g4zgforce");
  mocks.assertPlayer.mockResolvedValue({ user: { id: "verified-player" } });
  mocks.rpc.mockResolvedValue({
    data: { application_id: 42, team_id: 1, tournament_slug: "cup-13" },
    error: null,
  });
});
afterEach(() => vi.unstubAllEnvs());
function form(action: string) {
  const input = new FormData();
  for (const [key, value] of Object.entries({
    action,
    application_id: "42",
    version: "3",
    team_id: "1",
    tournament_id: "13",
  }))
    input.set(key, value);
  return input;
}
describe("registration notification scheduling", () => {
  it("schedules after the successful submit RPC and invalidates caches", async () => {
    expect(await playerRegistrationCommandAction({}, form("submit"))).toMatchObject({
      ok: true,
    });
    expect(mocks.assertPlayer).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith(
      "registration_command",
      expect.objectContaining({ p_actor: "verified-player", p_action: "submit" }),
    );
    expect(mocks.invalidate).toHaveBeenCalledOnce();
    expect(mocks.after).toHaveBeenCalledOnce();
    expect(mocks.notify).not.toHaveBeenCalled();
    await mocks.after.mock.calls[0]![0]();
    expect(mocks.notify).toHaveBeenCalledWith(42);
  });
  it("does not notify on failed submission", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: "40001", message: "stale" },
    });
    expect(await playerRegistrationCommandAction({}, form("submit"))).toMatchObject({
      ok: false,
    });
    expect(mocks.after).not.toHaveBeenCalled();
  });
  it("does not notify on draft creation or withdrawal", async () => {
    await expect(
      playerRegistrationCommandAction({}, form("application_create")),
    ).rejects.toThrow("redirect");
    await playerRegistrationCommandAction({}, form("withdraw"));
    expect(mocks.after).not.toHaveBeenCalled();
  });
  it("does not schedule when notifications are unconfigured", async () => {
    vi.stubEnv("TELEGRAM_ADMIN_USERNAME", "");
    await playerRegistrationCommandAction({}, form("submit"));
    expect(mocks.after).not.toHaveBeenCalled();
  });
});
