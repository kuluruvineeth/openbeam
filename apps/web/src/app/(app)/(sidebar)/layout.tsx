import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { getQueryClient, HydrateClient, trpc } from "@/trpc/server";

// Force dynamic rendering since we use headers() for authentication
export const dynamic = "force-dynamic";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = getQueryClient();

  const user = await queryClient.fetchQuery(trpc.user.me.queryOptions());

  if (!user) {
    redirect("/login");
  }

  if (!user.organizationId) {
    // @ts-expect-error - Next.js route type inference doesn't recognize /orgs/create
    redirect("/orgs/create");
  }

  return (
    <HydrateClient>
      <div className="relative flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col md:ml-[70px]">
          <Header />
          <div className="no-scrollbar flex-1 overflow-y-auto px-6">
            {children}
          </div>
        </div>
      </div>
    </HydrateClient>
  );
}
