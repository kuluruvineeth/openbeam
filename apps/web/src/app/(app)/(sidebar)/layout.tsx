import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { ensureAccess } from "@/lib/auth/ensure-access";
import { getQueryClient, HydrateClient, trpc } from "@/trpc/server";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureAccess();

  const queryClient = getQueryClient();
  const user = await queryClient.fetchQuery(trpc.user.me.queryOptions());

  if (!user) {
    redirect("/login");
  }

  if (!user.teamId) {
    redirect("/teams/create");
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
