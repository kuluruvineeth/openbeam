import Link from "next/link";
import { redirect } from "next/navigation";
import { Icons } from "@/components/icons";
import { ensureAccess } from "@/lib/auth/ensure-access";
import { getQueryClient, HydrateClient, trpc } from "@/trpc/server";

const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: "Dashboard" },
  { href: "/admin/members", label: "Members", icon: "Members" },
  { href: "/admin/roles", label: "Roles", icon: "Roles" },
  { href: "/admin/security", label: "Security", icon: "Security" },
  { href: "/admin/compliance", label: "Compliance", icon: "Compliance" },
  { href: "/admin/branding", label: "Branding", icon: "Branding" },
  { href: "/admin/billing", label: "Billing", icon: "Billing" },
  { href: "/admin/features", label: "Features", icon: "Features" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureAccess();

  const queryClient = getQueryClient();
  const user = await queryClient.fetchQuery(trpc.user.me.queryOptions());

  // TODO: Check if user has admin role
  // For now, just check if user has a team
  if (!user?.teamId) {
    redirect("/teams/create");
  }

  return (
    <HydrateClient>
      <div className="flex min-h-screen">
        {/* Admin Sidebar */}
        <aside className="fixed top-0 left-[70px] z-40 hidden h-screen w-[240px] border-border border-r bg-background md:block">
          <div className="flex h-[70px] items-center border-border border-b px-6">
            <Link className="flex items-center gap-2" href="/admin">
              <Icons.Settings size={20} />
              <span className="font-f37-stout text-lg">Admin</span>
            </Link>
          </div>

          <nav className="p-4">
            <ul className="space-y-1">
              {ADMIN_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    className="flex items-center gap-3 px-3 py-2 text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-foreground"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="absolute right-4 bottom-4 left-4">
            <Link
              className="flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
              href="/"
            >
              <Icons.ArrowLeft size={16} />
              Back to app
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:ml-[310px]">
          <div className="sticky top-0 z-30 flex h-[70px] items-center border-border border-b bg-background px-6">
            <div className="text-muted-foreground text-sm">
              <span className="text-foreground">Admin</span>
            </div>
          </div>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </HydrateClient>
  );
}
