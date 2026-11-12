import { Suspense } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { NotFoundBlock } from "@/components/system/NotFoundBlock";
import { Skeleton } from "@/components/ui/PageHeader";

export default function NotFound() {
  return (
    <div className="orbit-community flex min-h-screen flex-col">
      <Suspense fallback={<Skeleton className="h-20 rounded-none" />}>
        <SiteHeader />
      </Suspense>

      <main id="main-content" className="flex-1">
        <NotFoundBlock />
      </main>

      <SiteFooter />
    </div>
  );
}
