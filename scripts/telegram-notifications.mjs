#!/usr/bin/env node
// Bot setup is separate from Telegram OIDC. Never print tokens or API URLs.
import nextEnv from "@next/env";
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
nextEnv.loadEnvConfig(process.cwd());

const setup = process.argv.includes("--setup");
const siteArgument = process.argv
  .find((arg) => arg.startsWith("--site-url="))
  ?.slice("--site-url=".length);
const token = process.env.TELEGRAM_BOT_TOKEN;
const names = [
  ...new Set(
    (process.env.TELEGRAM_ADMIN_USERNAME ?? "")
      .split(",")
      .map((name) => name.trim().replace(/^@/, "").toLowerCase())
      .filter(Boolean),
  ),
];
async function call(method, body = {}) {
  let response;
  try {
    response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error("Telegram connection failed");
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok)
    throw new Error(`Telegram ${method}: HTTP ${response.status}`);
  return payload.result;
}

try {
  if (!token || !names.length || names.some((name) => !/^[a-z0-9_]{5,32}$/.test(name)))
    throw new Error(
      "Set TELEGRAM_BOT_TOKEN and comma-separated TELEGRAM_ADMIN_USERNAME in the environment",
    );
  const bot = await call("getMe");
  console.log(`Bot: https://t.me/${bot.username}`);
  console.log(`Recipients: ${names.map((name) => `@${name}`).join(", ")}`);
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error("Supabase write credentials are missing");
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: subscriptions, error } = await client
    .from("telegram_admin_chats")
    .select("username,active")
    .eq("bot_id", String(bot.id))
    .in("username", names);
  if (error)
    throw new Error(
      "Telegram subscription table is unavailable; apply migration 0021 first",
    );
  for (const name of names)
    console.log(
      `@${name}: ${subscriptions.some((row) => row.username === name && row.active) ? "subscribed" : "send /start to the bot"}`,
    );
  if (setup) {
    if (!siteArgument)
      throw new Error(
        "Provide the deployed origin explicitly: --site-url=https://g4z-cup.ru",
      );
    const site = new URL(siteArgument);
    if (
      site.protocol !== "https:" ||
      site.pathname !== "/" ||
      site.search ||
      site.hash ||
      site.username ||
      site.password
    )
      throw new Error("--site-url must be an HTTPS origin");
    const url = new URL("/api/telegram/webhook", site).href;
    // Probe before redirecting the bot's webhook. Missing or stale routes must
    // not be installed. The authenticated probe has no message or side effects.
    const probe = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    if (probe.status !== 403)
      throw new Error(
        `Webhook route is not ready (HTTP ${probe.status}); deploy the notification code and runtime environment first`,
      );
    const secret = createHmac("sha256", token)
      .update("g4z-cup/telegram-webhook/v1")
      .digest("hex");
    const authenticatedProbe = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Bot-Api-Secret-Token": secret,
      },
      body: JSON.stringify({ update_id: 0 }),
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    if (authenticatedProbe.status !== 200)
      throw new Error(
        `Webhook secret/configuration does not match (HTTP ${authenticatedProbe.status})`,
      );
    const current = await call("getWebhookInfo");
    if (current.url && current.url !== url)
      throw new Error(
        "The bot already has a different webhook; use a dedicated bot or explicitly remove the previous integration first",
      );
    await call("setWebhook", {
      url,
      secret_token: secret,
      allowed_updates: ["message"],
      max_connections: 1,
      drop_pending_updates: false,
    });
    console.log(`Webhook configured: ${url}`);
  }
  const webhook = await call("getWebhookInfo");
  console.log(
    JSON.stringify({
      webhookConfigured: Boolean(webhook.url),
      pendingUpdates: webhook.pending_update_count,
      deliveryError: Boolean(webhook.last_error_date),
    }),
  );
} catch (error) {
  const message =
    error instanceof Error
      ? error.message.replaceAll(token ?? "<unset>", "[redacted]")
      : "Telegram notification setup failed";
  console.error(message);
  process.exitCode = 1;
}
