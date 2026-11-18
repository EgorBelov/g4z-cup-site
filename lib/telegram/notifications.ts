import "server-only";
import { siteUrl } from "@/lib/env";
import { writeClient } from "@/lib/supabase/write";
import { applicationNotificationContext } from "@/lib/queries/registration";
import {
  telegramAdminUsernames,
  telegramBotId,
  telegramNotificationsConfigured,
} from "@/lib/telegram/config";
import { telegramCall } from "@/lib/telegram/api";

/** Runs after a committed submit. Failures must never fail the player's action. */
export async function notifyApplicationSubmitted(applicationId: number): Promise<void> {
  if (!telegramNotificationsConfigured()) return;
  try {
    const { data: chats, error } = await writeClient()
      .from("telegram_admin_chats")
      .select("username,chat_id")
      .eq("bot_id", telegramBotId())
      .eq("active", true)
      .in("username", telegramAdminUsernames());
    if (error) throw new Error("Could not load Telegram notification recipients");
    if (!chats?.length) {
      console.warn(
        "Telegram notifications: no subscribed organisers; send /start to the bot",
      );
      return;
    }
    const context = await applicationNotificationContext(applicationId);
    const url = new URL(
      `/admin/t/${encodeURIComponent(context.tournamentSlug)}/registrations/${applicationId}`,
      siteUrl(),
    ).href;
    const text = `Новая заявка на участие\n\nКоманда: ${context.teamName}\nТурнир: ${context.tournamentName}\nЗаявка №${applicationId}`;
    await Promise.all(
      chats.map(async (chat) => {
        try {
          // Usernames can change hands. Verify the pinned chat still owns the
          // allowed handle before delivering any application information.
          const current = await telegramCall<{
            id: number;
            type: string;
            username?: string;
          }>("getChat", { chat_id: chat.chat_id });
          if (
            current.type !== "private" ||
            String(current.id) !== chat.chat_id ||
            current.username?.toLowerCase() !== chat.username
          )
            return;
          await telegramCall("sendMessage", {
            chat_id: chat.chat_id,
            text,
            reply_markup: { inline_keyboard: [[{ text: "Открыть заявку", url }]] },
            link_preview_options: { is_disabled: true },
          });
        } catch {
          console.error("Telegram application notification delivery failed", {
            applicationId,
          });
        }
      }),
    );
  } catch {
    console.error("Telegram application notification failed", { applicationId });
  }
}
