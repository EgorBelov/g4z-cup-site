import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/admin/LoginForm";
import { Skeleton } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Вход в админку",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-card border border-edge bg-panel p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          G4Z CUP
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
          Вход для организаторов
        </h1>
        <p className="mt-3 text-sm text-ink-muted">
          Пароль общий для организаторов. Все изменения попадают в журнал.
        </p>

        <Suspense fallback={<Skeleton className="mt-6 h-40" />}>
          {searchParams.then(({ next }) => (
            <LoginForm redirectTo={next ?? "/admin"} />
          ))}
        </Suspense>

        <Link
          href="/"
          className="mt-6 inline-block text-sm text-ink-faint hover:text-ink"
        >
          ← Вернуться на сайт
        </Link>
      </div>
    </main>
  );
}
