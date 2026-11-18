import { processTelegramUpdateAction } from "@/lib/actions/telegram-notifications";
import { validTelegramWebhookSecret } from "@/lib/telegram/config";

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
