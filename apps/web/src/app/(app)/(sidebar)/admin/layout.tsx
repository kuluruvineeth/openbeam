import { redirect } from "next/navigation";
import { AdminNav } from "@/features/admin/components/admin-nav";
import { getQueryClient, trpc } from "@/trpc/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = getQueryClient();
  const user = await queryClient.fetchQuery(trpc.user.me.queryOptions());

  if (!user?.teamId) {
    redirect("/");
  }

  const membership = await queryClient.fetchQuery(
    trpc.team.getUserRole.queryOptions()
  );

  if (membership?.role !== "OWNER" && membership?.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="font-medium text-xl">Admin Console</h1>
        <p className="text-muted-foreground text-sm">
          Manage your team, connectors, and monitor usage.
        </p>
      </div>
      <AdminNav />
      {children}
    </div>
  );
}
