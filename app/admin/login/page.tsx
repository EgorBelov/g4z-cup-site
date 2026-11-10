import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
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
      <div className="w-full max-w-lg border-y border-edge py-10">
        <Link href="/" aria-label="G4Z CUP — главная">
          <BrandMark className="mb-8 size-20" />
        </Link>
        <p className="eyebrow">G4Z CUP</p>
        <h1 className="page-title">Всё начинается за кулисами.</h1>
        <p className="mt-3 text-sm text-ink-muted">
          Вход для организаторов. Пароль общий, все изменения попадают в журнал.
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
