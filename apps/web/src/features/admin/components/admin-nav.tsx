"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex gap-1 border-border/50 border-b">
      <NavLink active={pathname === "/admin"} href="/admin" label="Dashboard" />
      <NavLink
        active={pathname.startsWith("/admin/team")}
        href="/admin/team"
        label="Team"
      />
      <NavLink
        active={pathname.startsWith("/admin/connectors")}
        href="/admin/connectors"
        label="Connectors"
      />
      <NavLink
        active={pathname.startsWith("/admin/security")}
        href="/admin/security"
        label="Security"
      />
    </nav>
  );
}

function NavLink({
  href,
  label,
  active,
}: {
  href: "/admin" | "/admin/team" | "/admin/connectors" | "/admin/security";
  label: string;
  active: boolean;
}) {
  return (
    <Link
      className={cn(
        "border-b-2 px-3 py-2 text-sm transition-colors",
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:border-foreground/20 hover:text-foreground"
      )}
      href={href}
    >
      {label}
    </Link>
  );
}
