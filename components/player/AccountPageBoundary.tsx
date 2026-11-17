import { Suspense, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/PageHeader";

/** Keep request-time reads below the page's instant-navigation boundary. */
export function AccountPageBoundary({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div role="status" aria-label="Загрузка страницы">
          <Skeleton className="h-64" />
          <span className="sr-only">Загружаем страницу…</span>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
