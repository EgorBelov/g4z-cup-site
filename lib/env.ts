/**
 * Environment access with a single failure point.
 *
 * Server-side secrets are read lazily so that importing this module from a
 * client bundle can never require them.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

/** Public Supabase URL — safe in the browser. */
export function supabaseUrl(): string {
  const url = required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );

  try {
    new URL(url);
  } catch {
    throw new Error(`NEXT_PUBLIC_SUPABASE_URL is not a valid URL: "${url}"`);
  }

  return url;
}

/** Anon key — read-only by RLS, safe in the browser. */
export function supabaseAnonKey(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** Service role key — bypasses RLS. Server only. */
export function supabaseServiceKey(): string {
  return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function adminPasswordHash(): string {
  return required("ADMIN_PASSWORD_HASH", process.env.ADMIN_PASSWORD_HASH);
}

export function authSecret(): string {
  const secret = required("AUTH_SECRET", process.env.AUTH_SECRET);

  if (secret.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters long.");
  }

  return secret;
}

export function siteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}
