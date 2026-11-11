import { Suspense, type ReactNode } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Container, Skeleton } from "@/components/ui/PageHeader";
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<Skeleton className="h-20 rounded-none" />}>
        <SiteHeader />
      </Suspense>
      <main id="main-content" className="flex-1">
        <Container className="py-8 sm:py-12">
          <Suspense fallback={<Skeleton className="h-64" />}>{children}</Suspense>
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}
