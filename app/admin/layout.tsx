import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: { default: "Админка", template: "%s — админка G4Z CUP" },
  robots: { index: false, follow: false },
};

/**
 * The admin tree is request-time by nature: every page reads the session cookie
 * and queries live data with the service role. The Suspense boundary here is
 * what tells Cache Components that deferring these routes is intentional, and
 * it keeps that decision scoped to /admin — public pages stay prerendered.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
            <Skeleton className="h-14" />
            <Skeleton className="mt-4 h-64" />
          </div>
        }
      >
        {children}
      </Suspense>
    </div>
  );
}
