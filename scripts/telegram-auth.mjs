#!/usr/bin/env node
// Read-only preflight by default; --setup explicitly configures this project's
// Telegram provider and exact application callback. Never print auth payloads.
import { createClient } from "@supabase/supabase-js";
import { randomBytes, createHash } from "node:crypto";
import { readFileSync } from "node:fs";

for (const file of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* The ambient environment is enough in CI. */
  }
}

const identifier = "custom:telegram";
const issuer = "https://oauth.telegram.org";
const setup = process.argv.includes("--setup");
const env = process.env;
function required(key) {
  if (!env[key])
    throw new Error(
      `Добавьте ${key} локально в .env (значение не нужно присылать в чат).`,
    );
  return env[key];
}
async function request(url, options) {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(15_000), ...options });
  } catch {
    throw new Error(`Не удалось подключиться к ${new URL(url).origin}`);
  }
}

try {
  const base = new URL(required("NEXT_PUBLIC_SUPABASE_URL")).origin;
  const site = new URL(required("NEXT_PUBLIC_SITE_URL"));
  if (
    site.pathname !== "/" ||
    site.search ||
    site.hash ||
    site.username ||
    site.password ||
    (site.protocol !== "https:" &&
      !(
        site.protocol === "http:" && ["localhost", "127.0.0.1"].includes(site.hostname)
      ))
  ) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL должен быть HTTPS origin (HTTP допустим только для localhost).",
    );
  }
  const callback = `${site.origin}/auth/callback`;
  const providerCallback = `${base}/auth/v1/callback`;
  console.log(
    `Callback для BotFather → Login Widget → Allowed URLs: ${providerCallback}`,
  );
  console.log(`Callback приложения в Supabase Auth → URL Configuration: ${callback}`);

  const client = createClient(base, required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: request },
  });
  const api = client.auth.admin.customProviders;
  const listing = await api.listProviders();
  if (listing.error)
    throw new Error(
      `Список провайдеров недоступен (${listing.error.code ?? listing.error.status}).`,
    );
  let provider = listing.data.providers.find((p) => p.identifier === identifier);
  console.log(
    provider ? "✓ Провайдер Telegram существует" : "• Провайдер Telegram ещё не создан",
  );

  // Inspect Telegram's real discovery document: no fabricated UserInfo URL.
  const discoveryResponse = await request(`${issuer}/.well-known/openid-configuration`);
  if (!discoveryResponse.ok)
    throw new Error(`Telegram discovery: HTTP ${discoveryResponse.status}`);
  const discovery = await discoveryResponse.json();
  if (
    discovery.issuer !== issuer ||
    !discovery.code_challenge_methods_supported?.includes("S256")
  ) {
    throw new Error("Неожиданная конфигурация Telegram OIDC/PKCE.");
  }
  console.log(
    `✓ Telegram OIDC/PKCE S256 доступен; UserInfo endpoint: ${discovery.userinfo_endpoint ? "есть" : "отсутствует"}`,
  );

  // Management API is needed for URL configuration, not for browser login.
  const ref = new URL(base).hostname.split(".")[0];
  const configUrl = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
  const headers = {
    Authorization: `Bearer ${required("SUPABASE_ACCESS_TOKEN")}`,
    "Content-Type": "application/json",
  };
  const configResponse = await request(configUrl, { headers });
  if (!configResponse.ok)
    throw new Error(
      `Конфигурация Supabase Auth недоступна: HTTP ${configResponse.status}`,
    );
  const config = await configResponse.json();
  const allowed = (config.uri_allow_list ?? "").split(",").filter(Boolean);

  if (setup) {
    const settings = {
      name: "Telegram",
      client_id: required("TELEGRAM_CLIENT_ID"),
      client_secret: required("TELEGRAM_CLIENT_SECRET"),
      issuer,
      scopes: ["openid", "profile"],
      email_optional: true,
      pkce_enabled: true,
      skip_nonce_check: false,
      enabled: true,
    };
    if (!/^\d+$/.test(settings.client_id))
      throw new Error("TELEGRAM_CLIENT_ID должен быть числовым ID из BotFather.");
    if (provider && (provider.provider_type !== "oidc" || provider.issuer !== issuer)) {
      throw new Error(
        "Существующий custom:telegram относится к другому провайдеру; автоматическая замена отменена.",
      );
    }
    const result = provider
      ? await api.updateProvider(identifier, settings)
      : await api.createProvider({ ...settings, identifier, provider_type: "oidc" });
    if (result.error)
      throw new Error(
        `Настройка провайдера отклонена (${result.error.code ?? result.error.status}).`,
      );
    provider = result.data;
    const response = await request(configUrl, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        site_url: site.origin,
        uri_allow_list: [...new Set([...allowed, callback])].join(","),
      }),
    });
    if (!response.ok)
      throw new Error(
        `Провайдер настроен, но callback не сохранён: HTTP ${response.status}`,
      );
    allowed.push(callback);
    config.site_url = site.origin;
    console.log(
      "✓ Провайдер и callback настроены; остальные адреса возврата сохранены",
    );
  }
  const problems = [];
  if (!provider)
    problems.push(
      "Нет custom:telegram: добавьте TELEGRAM_CLIENT_ID/TELEGRAM_CLIENT_SECRET в .env и выполните npm run auth:telegram:setup.",
    );
  else {
    if (
      provider.provider_type !== "oidc" ||
      provider.issuer !== issuer ||
      !provider.enabled
    )
      problems.push("Нужен включённый OIDC-провайдер Telegram.");
    if (!provider.email_optional)
      problems.push("Для Telegram требуется email_optional=true.");
    if (provider.pkce_enabled !== true || provider.skip_nonce_check)
      problems.push("Нужны pkce_enabled=true и skip_nonce_check=false.");
    if (
      !provider.scopes?.includes("profile") ||
      provider.scopes?.some((s) => !["openid", "profile"].includes(s))
    )
      problems.push(
        "Допустимые scopes: только openid/profile, без телефона и отправки сообщений.",
      );
  }
  if (config.site_url !== site.origin)
    problems.push("Supabase Auth Site URL отличается от NEXT_PUBLIC_SITE_URL.");
  if (!allowed.includes(callback))
    problems.push(
      "Точный callback приложения отсутствует в Redirect URLs Supabase Auth.",
    );
  for (const problem of problems) console.error(`✗ ${problem}`);
  if (problems.length) process.exitCode = 1;
  else {
    // Check that the actual hosted Auth server accepts the provider and sends
    // the browser to Telegram with PKCE. No account or session is created here.
    const url = new URL(`${base}/auth/v1/authorize`);
    url.search = new URLSearchParams({
      provider: identifier,
      redirect_to: callback,
      code_challenge: createHash("sha256").update(randomBytes(32)).digest("base64url"),
      code_challenge_method: "s256",
    }).toString();
    const response = await request(url, { redirect: "manual" });
    const location = response.headers.get("location");
    if (response.status !== 302 || !location)
      throw new Error(
        `Supabase authorize: ожидается redirect, получен HTTP ${response.status}`,
      );
    const target = new URL(location);
    if (
      target.origin !== issuer ||
      target.pathname !== "/auth" ||
      target.searchParams.get("redirect_uri") !== providerCallback ||
      target.searchParams.get("code_challenge_method") !== "S256" ||
      !target.searchParams.get("state") ||
      !target.searchParams.get("code_challenge") ||
      target.searchParams.get("response_type") !== "code"
    ) {
      throw new Error(
        "Supabase не сформировал ожидаемый Telegram redirect с code/PKCE/state.",
      );
    }
    // Custom OIDC code flows do not automatically add a nonce. Do not claim
    // that checking the provider's skip_nonce_check setting proves otherwise.
    console.log("✓ Supabase направляет на Telegram с code/PKCE/state");
    console.log(
      "Далее нужен реальный вход в браузере: проверить callback, сессию и повторный вход без email. Этот preflight их не подтверждает.",
    );
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
