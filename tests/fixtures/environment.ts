// Public, disposable values for the local test server. Never use real credentials.
export const fixtureSecret = "fixture-only-secret-0123456789abcdef0123456789abcdef";

export const fixtureEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54329",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "fixture-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "fixture-service-key",
  AUTH_SECRET: fixtureSecret,
  ADMIN_PASSWORD_HASH: "fixture-password-disabled",
  NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
  NEXT_PUBLIC_COMMUNITY_TELEGRAM_URL: "https://t.me/g4zagzes",
  NEXT_PUBLIC_COMMUNITY_STREAM_URL: "https://www.twitch.tv/g4zcup_ru",
};
