import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export function telegramAdminUsernames(): string[] {
  return [
    ...new Set(
      (process.env.TELEGRAM_ADMIN_USERNAME ?? "")
        .split(",")
        .map((name) =>
          name
            .trim()
            .replace(/^["']+|["']+$/g, "")
            .trim()
            .replace(/^@/, "")
            .toLowerCase(),
        )
        .filter((name) => /^[a-z0-9_]{5,32}$/.test(name)),
    ),
  ];
}

export function telegramBotId(): string {
  return (process.env.TELEGRAM_BOT_TOKEN ?? "").split(":")[0] ?? "";
}

export function telegramNotificationsConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && telegramAdminUsernames().length);
}

// Deterministic across deploys; no additional environment secret is required.
export function telegramWebhookSecret(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is missing");
  return createHmac("sha256", token)
    .update("g4z-cup/telegram-webhook/v1")
    .digest("hex");
}

export function validTelegramWebhookSecret(value: string | null): boolean {
  if (!process.env.TELEGRAM_BOT_TOKEN || !value) return false;
  const expected = Buffer.from(telegramWebhookSecret());
  const actual = Buffer.from(value);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
