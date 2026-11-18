"use server";
import "server-only";
import { headers } from "next/headers";
import { writeClient } from "@/lib/supabase/write";
import { telegramUpdateSchema } from "@/lib/validation/schemas";
import {
  telegramAdminUsernames,
  telegramBotId,
  validTelegramWebhookSecret,
} from "@/lib/telegram/config";
import { telegramCall } from "@/lib/telegram/api";

export async function processTelegramUpdateAction(input: unknown): Promise<number> {
  if (
    !validTelegramWebhookSecret(
      (await headers()).get("x-telegram-bot-api-secret-token"),
    )
  )
    return 403;
  const parsed = telegramUpdateSchema.safeParse(input);
  if (!parsed.success) return 400;
  const message = parsed.data.message;
  const sender = message?.from;
  // Only the sender of a private message can subscribe their own chat.
  if (
    !message ||
    !sender ||
    sender.is_bot ||
    message.chat.type !== "private" ||
    message.chat.id !== sender.id
  )
    return 200;
  const command = message.text?.trim().split(/\s+/)[0]?.toLowerCase();
  if (command !== "/start" && command !== "/stop") return 200;
  const client = writeClient();
  const botId = telegramBotId();
  const chatId = String(sender.id);
  if (command === "/stop") {
    const { error } = await client
      .from("telegram_admin_chats")
      .update({ active: false })
      .eq("bot_id", botId)
      .eq("chat_id", chatId);
    if (error) throw new Error("Could not stop Telegram notifications");
  } else {
    const username = sender.username?.toLowerCase();
    if (!username || !telegramAdminUsernames().includes(username)) return 200;
    // Pin the first chat ID: reassignment of a username cannot silently redirect
    // existing subscriptions. Rebinding requires explicit database maintenance.
    const { error: insertError } = await client
      .from("telegram_admin_chats")
      .upsert(
        { bot_id: botId, username, chat_id: chatId },
        { onConflict: "bot_id,username", ignoreDuplicates: true },
      );
    if (insertError) throw new Error("Could not subscribe Telegram chat");
    const { data, error } = await client
      .from("telegram_admin_chats")
      .update({ active: true })
      .eq("bot_id", botId)
      .eq("username", username)
      .eq("chat_id", chatId)
      .select("chat_id");
    if (error) throw new Error("Could not enable Telegram notifications");
    if (!data?.length) return 200;
  }
  // A failed acknowledgement must not roll back the persisted subscription.
  try {
    await telegramCall("sendMessage", {
      chat_id: chatId,
      text:
        command === "/stop"
          ? "Уведомления о заявках отключены. Чтобы включить снова, отправьте /start."
          : "Уведомления G4Z CUP подключены. Новые заявки команд будут приходить сюда со ссылкой на рассмотрение. Отключить: /stop.",
    });
  } catch {
    console.error("Telegram subscription acknowledgement failed");
  }
  return 200;
}
