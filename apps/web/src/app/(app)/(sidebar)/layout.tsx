import { AuthLayoutSkeleton } from "@/components/auth/loading-skeleton";
import { OrgGuard } from "@/components/auth/org-guard";
import { ClientOnly } from "@/components/client-only";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { HydrateClient } from "@/trpc/server";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <HydrateClient>
      <ClientOnly fallback={<AuthLayoutSkeleton />}>
        <OrgGuard>
          <div className="relative flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex flex-1 flex-col md:ml-[70px]">
              <Header />
              <div className="no-scrollbar flex-1 overflow-y-auto px-6">
                {children}
              </div>
            </div>
          </div>
        </OrgGuard>
      </ClientOnly>
    </HydrateClient>
  );
}
