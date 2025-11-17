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

  return (
    <HydrateClient>
      <div className="relative">
        <Sidebar />
        <div className="pb-8 md:ml-[70px]">
          <Header />
          <div className="px-6">{children}</div>
        </div>
      </div>
    </HydrateClient>
  );
}
