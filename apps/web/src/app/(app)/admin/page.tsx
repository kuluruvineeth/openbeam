"use client";

import Link from "next/link";
import { Icons } from "@/components/icons";

const QUICK_STATS = [
  { label: "Total Members", value: "24", change: "+3 this month" },
  { label: "Active Connectors", value: "8", change: "2 syncing" },
  { label: "Documents Indexed", value: "12.4k", change: "+1.2k this week" },
  { label: "Search Queries", value: "3.2k", change: "Last 7 days" },
];

const QUICK_ACTIONS = [
  {
    href: "/admin/members/invite",
    label: "Invite Members",
    description: "Add new team members",
    icon: Icons.Plus,
  },
  {
    href: "/admin/security/sso",
    label: "Configure SSO",
    description: "Set up single sign-on",
    icon: Icons.ShieldIcon,
  },
  {
    href: "/admin/branding",
    label: "Custom Branding",
    description: "Customize your workspace",
    icon: Icons.Sparkle,
  },
  {
    href: "/admin/features",
    label: "Feature Flags",
    description: "Manage feature access",
    icon: Icons.Settings,
  },
];

export default function AdminDashboard() {
  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-1 font-f37-stout text-2xl">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your workspace settings and team
        </p>
      </div>

      {/* Quick Stats */}
      <div className="mb-8 grid grid-cols-4 gap-4">
        {QUICK_STATS.map((stat) => (
          <div
            className="border border-border bg-background p-4"
            key={stat.label}
          >
            <p className="mb-1 text-muted-foreground text-sm">{stat.label}</p>
            <p className="mb-1 font-f37-stout text-2xl">{stat.value}</p>
            <p className="text-muted-foreground text-xs">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <section className="mb-8">
        <h2 className="mb-4 font-medium text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                className="group flex items-center gap-4 border border-border bg-background p-4 transition-colors hover:border-primary/50"
                href={action.href}
                key={action.href}
              >
                <div className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary">
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-foreground group-hover:text-primary">
                    {action.label}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {action.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="mb-4 font-medium text-foreground">Recent Activity</h2>
        <div className="border border-border bg-background">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Icons.History className="mb-4 text-muted-foreground" size={32} />
            <h3 className="mb-2 font-medium text-foreground">
              Activity feed coming soon
            </h3>
            <p className="text-muted-foreground text-sm">
              Recent admin actions and team activity will appear here
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
