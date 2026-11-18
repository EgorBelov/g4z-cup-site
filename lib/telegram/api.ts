import "server-only";

export async function telegramCall<T>(
  method: "sendMessage" | "getChat",
  body: Record<string, unknown>,
): Promise<T> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is missing");
  let response: Response;
  try {
    response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
  } catch {
    // Fetch errors can contain the request URL, which includes the bot token.
    throw new Error("Telegram network request failed");
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) {
    throw new Error(`Telegram ${method} failed (${response.status})`);
  }
  return payload.result as T;
}
