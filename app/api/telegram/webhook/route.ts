import { processTelegramUpdateAction } from "@/lib/actions/telegram-notifications";
import {
  telegramAdminUsernames,
  telegramBotId,
  validTelegramWebhookSecret,
} from "@/lib/telegram/config";
import { isWriteConfigured } from "@/lib/supabase/write";

/** Operator diagnostics require the same secret as Telegram deliveries. */
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (
    !validTelegramWebhookSecret(request.headers.get("x-telegram-bot-api-secret-token"))
  )
    return new Response(null, { status: 403, headers });
  return Response.json(
    {
      version: "telegram-notifications-v2",
      botId: telegramBotId(),
      adminUsernames: telegramAdminUsernames(),
      writeConfigured: isWriteConfigured(),
    },
    { headers },
  );
}

export async function POST(request: Request) {
  if (
    !validTelegramWebhookSecret(request.headers.get("x-telegram-bot-api-secret-token"))
  )
    return new Response(null, { status: 403 });
  let input: unknown;
  try {
    const body = await request.text();
    if (body.length > 65536) return new Response(null, { status: 413 });
    input = JSON.parse(body);
  } catch {
    return new Response(null, { status: 400 });
  }
  try {
    const status = await processTelegramUpdateAction(input);
    return new Response(null, { status });
  } catch {
    console.error("Telegram webhook processing failed");
    return new Response(null, { status: 500 });
  }
}
