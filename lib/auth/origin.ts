import "server-only";
import { headers } from "next/headers";
import { siteUrl } from "@/lib/env";

// Both domains belong to this application. Keep each browser on its original
// domain: cookies on the custom domain do not exist on the Vercel alias.
export const productionAuthOrigins = [
  "https://g4z-cup.ru",
  "https://g4z-cup-site.vercel.app",
];
/**
 * `next dev` has to accept the local origin even when NEXT_PUBLIC_SITE_URL points
 * at production, otherwise Telegram and Discord callbacks cannot be tested.
 * Production builds stay strict.
 */
function localDevelopmentOrigin(value: string): boolean {
  return (
    process.env.NODE_ENV !== "production" && /^http:\/\/localhost(:\d+)?$/.test(value)
  );
}
export function allowedAuthOrigin(value: string): boolean {
  const configured = new URL(siteUrl()).origin;
  return (
    productionAuthOrigins.includes(value) ||
    value === configured ||
    localDevelopmentOrigin(value)
  );
}
export async function authRequestOrigin(): Promise<string> {
  const origin = (await headers()).get("origin");
  if (!origin || !allowedAuthOrigin(origin))
    throw new Error("Откройте регистрацию на основном сайте G4Z CUP");
  return origin;
}
