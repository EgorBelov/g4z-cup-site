import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { siteUrl } from "@/lib/env";
import { MotionSettings } from "@/components/brand/MotionSettings";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "G4Z CUP",
    template: "%s — G4Z CUP",
  },
  description:
    "G4Z CUP — игровое сообщество и турниры по Dota 2, CS2 и другим дисциплинам. Расписание, составы, результаты и история наших игр.",
  openGraph: {
    type: "website",
    siteName: "G4Z CUP",
    locale: "ru_RU",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" data-scroll-behavior="smooth">
      <body className="min-h-screen bg-surface text-ink">
        <MotionSettings />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
