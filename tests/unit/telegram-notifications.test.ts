import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  telegramAdminUsernames,
  telegramWebhookSecret,
  validTelegramWebhookSecret,
} from "@/lib/telegram/config";
import { telegramCall } from "@/lib/telegram/api";
import { notifyApplicationSubmitted } from "@/lib/telegram/notifications";
import { processTelegramUpdateAction } from "@/lib/actions/telegram-notifications";
import { POST } from "@/app/api/telegram/webhook/route";

const mocks = vi.hoisted(() => ({ from: vi.fn(), headers: vi.fn(), context: vi.fn() }));
vi.mock("@/lib/supabase/write", () => ({ writeClient: () => ({ from: mocks.from }) }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/lib/queries/registration", () => ({
  applicationNotificationContext: mocks.context,
}));

function query(data: unknown = [], error: unknown = null) {
  const result = { data, error };
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    then: (resolve: (value: typeof result) => unknown) =>
      Promise.resolve(result).then(resolve),
  };
  for (const method of [chain.select, chain.eq, chain.in, chain.update, chain.upsert])
    method.mockReturnValue(chain);
  return chain;
}
function response(result: unknown, status = 200) {
  return Response.json({ ok: status === 200, result }, { status });
}
function update(username = "G4ZGforce", command = "/start") {
  return {
    update_id: 123,
    message: {
      text: command,
      from: { id: 777, is_bot: false, username },
      chat: { id: 777, type: "private" },
    },
  };
}

beforeEach(() => {
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "12345:test-token");
  vi.stubEnv("TELEGRAM_ADMIN_USERNAME", "g4zgforce,Hisoka_Egorka_Be");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://g4z-cup.ru");
  mocks.from.mockReset();
  mocks.headers.mockResolvedValue(
    new Headers({ "x-telegram-bot-api-secret-token": telegramWebhookSecret() }),
  );
  mocks.context.mockResolvedValue({
    teamName: "Team <&>",
    tournamentName: "G4Z CUP 13",
    tournamentSlug: "g4z-cup-13",
  });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({})));
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Telegram config and API", () => {
  it("normalizes comma-separated usernames and removes duplicates", () => {
    vi.stubEnv(
      "TELEGRAM_ADMIN_USERNAME",
      " @G4ZGforce, Hisoka_Egorka_Be, G4ZGFORCE, ,invalid! ",
    );
    expect(telegramAdminUsernames()).toEqual(["g4zgforce", "hisoka_egorka_be"]);
  });
  it("rejects missing or wrong webhook secrets and changes with the token", () => {
    const secret = telegramWebhookSecret();
    expect(validTelegramWebhookSecret(secret)).toBe(true);
    expect(validTelegramWebhookSecret(null)).toBe(false);
    expect(validTelegramWebhookSecret("a".repeat(secret.length))).toBe(false);
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "12345:replacement");
    expect(validTelegramWebhookSecret(secret)).toBe(false);
  });
  it("uses uncached POST requests and a timeout", async () => {
    await telegramCall("sendMessage", { chat_id: "777", text: "hello" });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.telegram.org/bot12345:test-token/sendMessage",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        signal: expect.any(AbortSignal),
        body: JSON.stringify({ chat_id: "777", text: "hello" }),
      }),
    );
  });
  it("sanitizes network errors so a URL cannot leak the token", async () => {
    vi.mocked(fetch).mockRejectedValue(
      new Error("https://api.telegram.org/bot12345:test-token/sendMessage"),
    );
    await expect(telegramCall("sendMessage", {})).rejects.toThrow(
      "Telegram network request failed",
    );
  });
  it("rejects Telegram errors even with HTTP 200", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ ok: false, description: "failure" }),
    );
    await expect(telegramCall("sendMessage", {})).rejects.toThrow(
      "Telegram sendMessage failed (200)",
    );
  });
});

describe("Telegram webhook subscriptions", () => {
  it("checks authentication inside the action before accessing the database", async () => {
    mocks.headers.mockResolvedValue(new Headers());
    expect(await processTelegramUpdateAction(update())).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("rejects an unauthenticated webhook request", async () => {
    expect(
      (
        await POST(
          new Request("https://example.test/api/telegram/webhook", {
            method: "POST",
            body: JSON.stringify(update()),
          }),
        )
      ).status,
    ).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("rejects malformed payloads", async () => {
    expect(await processTelegramUpdateAction({ update_id: "bad" })).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("accepts a webhook probe without side effects", async () => {
    expect(await processTelegramUpdateAction({ update_id: 0 })).toBe(200);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("ignores users outside the configured list", async () => {
    expect(await processTelegramUpdateAction(update("outsider"))).toBe(200);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["group", "supergroup", "channel"])("ignores %s chats", async (type) => {
    const input = update();
    input.message.chat.type = type;
    expect(await processTelegramUpdateAction(input)).toBe(200);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("ignores bots and mismatched private chat IDs", async () => {
    const input = update();
    input.message.from.is_bot = true;
    await processTelegramUpdateAction(input);
    input.message.from.is_bot = false;
    input.message.chat.id = 123;
    await processTelegramUpdateAction(input);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("pins allowed usernames to their chat and confirms subscription", async () => {
    const insert = query();
    const enable = query([{ chat_id: "777" }]);
    mocks.from.mockReturnValueOnce(insert).mockReturnValueOnce(enable);
    expect(await processTelegramUpdateAction(update())).toBe(200);
    expect(insert.upsert).toHaveBeenCalledWith(
      { bot_id: "12345", username: "g4zgforce", chat_id: "777" },
      { onConflict: "bot_id,username", ignoreDuplicates: true },
    );
    expect(enable.eq).toHaveBeenCalledWith("chat_id", "777");
    expect(
      JSON.parse(vi.mocked(fetch).mock.calls[0]![1]!.body as string).text,
    ).toContain("подключены");
  });
  it("does not confirm a subscription pinned to another chat", async () => {
    mocks.from.mockReturnValue(query());
    expect(await processTelegramUpdateAction(update())).toBe(200);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("allows stopping even after removal from the allowlist", async () => {
    const stop = query();
    mocks.from.mockReturnValue(stop);
    expect(await processTelegramUpdateAction(update("removed_admin", "/stop"))).toBe(
      200,
    );
    expect(stop.update).toHaveBeenCalledWith({ active: false });
    expect(stop.eq).toHaveBeenCalledWith("bot_id", "12345");
    expect(stop.eq).toHaveBeenCalledWith("chat_id", "777");
  });
  it("keeps the subscription when its acknowledgement fails", async () => {
    mocks.from.mockReturnValue(query([{ chat_id: "777" }]));
    vi.mocked(fetch).mockRejectedValue(new Error("offline"));
    expect(await processTelegramUpdateAction(update())).toBe(200);
  });
  it("returns 500 for storage failures so Telegram can retry", async () => {
    mocks.from.mockReturnValue(query(null, { code: "storage" }));
    const result = await POST(
      new Request("https://example.test/api/telegram/webhook", {
        method: "POST",
        headers: { "x-telegram-bot-api-secret-token": telegramWebhookSecret() },
        body: JSON.stringify(update()),
      }),
    );
    expect(result.status).toBe(500);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("Application notifications", () => {
  it("delivers names and a protected admin link only to configured active chats", async () => {
    const recipients = query([{ username: "g4zgforce", chat_id: "777" }]);
    mocks.from.mockReturnValue(recipients);
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        response({ id: 777, type: "private", username: "G4ZGforce" }),
      )
      .mockResolvedValueOnce(response({}));
    await notifyApplicationSubmitted(42);
    expect(recipients.eq).toHaveBeenCalledWith("active", true);
    expect(recipients.eq).toHaveBeenCalledWith("bot_id", "12345");
    expect(recipients.in).toHaveBeenCalledWith("username", [
      "g4zgforce",
      "hisoka_egorka_be",
    ]);
    const payload = JSON.parse(vi.mocked(fetch).mock.calls[1]![1]!.body as string);
    expect(payload.text).toContain("Команда: Team <&>");
    expect(payload.text).toContain("Турнир: G4Z CUP 13");
    expect(payload.parse_mode).toBeUndefined();
    expect(payload.reply_markup.inline_keyboard[0][0].url).toBe(
      "https://g4z-cup.ru/admin/t/g4z-cup-13/registrations/42",
    );
  });
  it("does not send application data if the chat changed username", async () => {
    mocks.from.mockReturnValue(query([{ username: "g4zgforce", chat_id: "777" }]));
    vi.mocked(fetch).mockResolvedValue(
      response({ id: 777, type: "private", username: "someone_else" }),
    );
    await notifyApplicationSubmitted(42);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("continues with other recipients when one delivery fails", async () => {
    mocks.from.mockReturnValue(
      query([
        { username: "g4zgforce", chat_id: "777" },
        { username: "hisoka_egorka_be", chat_id: "888" },
      ]),
    );
    vi.mocked(fetch).mockImplementation(async (_url, init) => {
      const body = JSON.parse(init!.body as string);
      if (body.chat_id === "777") return response({}, 403);
      return response({ id: 888, type: "private", username: "Hisoka_Egorka_Be" });
    });
    await expect(notifyApplicationSubmitted(42)).resolves.toBeUndefined();
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(
          ([url, init]) =>
            String(url).endsWith("/sendMessage") &&
            JSON.parse(init!.body as string).chat_id === "888",
        ),
    ).toBe(true);
  });
  it("does not fail the action on database outages", async () => {
    mocks.from.mockReturnValue(query(null, { code: "offline" }));
    await expect(notifyApplicationSubmitted(42)).resolves.toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("does nothing when the bot is disabled", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    await notifyApplicationSubmitted(42);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
