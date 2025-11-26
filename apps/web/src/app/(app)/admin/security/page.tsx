"use client";

import Link from "next/link";
import { Icons } from "@/components/icons";

const SECURITY_SECTIONS = [
  {
    title: "Single Sign-On",
    description: "Configure SSO with SAML or OIDC",
    href: "/admin/security/sso",
    icon: Icons.ShieldIcon,
    status: "Not configured",
  },
  {
    title: "Audit Logs",
    description: "View security and activity logs",
    href: "/admin/security/audit",
    icon: Icons.History,
    status: "Active",
  },
  {
    title: "Security Alerts",
    description: "Review and manage security alerts",
    href: "/admin/security/alerts",
    icon: Icons.AlertCircle,
    status: "3 open",
  },
];

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-1 font-f37-stout text-xl">Security</h1>
        <p className="text-muted-foreground text-sm">
          Manage security settings and monitor activity
        </p>
      </div>

      {/* Security Sections */}
      <div className="space-y-4">
        {SECURITY_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              className="group flex items-center justify-between border border-border bg-background p-6 transition-colors hover:border-primary/50"
              href={section.href}
              key={section.href}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center bg-muted text-muted-foreground">
                  <Icon size={24} />
                </div>
                <div>
                  <h3 className="font-medium text-foreground group-hover:text-primary">
                    {section.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {section.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground text-sm">
                  {section.status}
                </span>
                <Icons.ArrowRight
                  className="text-muted-foreground group-hover:text-primary"
                  size={18}
                />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Security Overview */}
      <section className="mt-8">
        <h2 className="mb-4 font-medium text-foreground">Security Overview</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="border border-border bg-background p-4">
            <p className="mb-1 text-muted-foreground text-sm">MFA Enabled</p>
            <p className="font-f37-stout text-2xl text-foreground">85%</p>
            <p className="text-muted-foreground text-xs">of team members</p>
          </div>
          <div className="border border-border bg-background p-4">
            <p className="mb-1 text-muted-foreground text-sm">
              Failed Logins (7d)
            </p>
            <p className="font-f37-stout text-2xl text-foreground">12</p>
            <p className="text-muted-foreground text-xs">-3 from last week</p>
          </div>
          <div className="border border-border bg-background p-4">
            <p className="mb-1 text-muted-foreground text-sm">
              API Keys Active
            </p>
            <p className="font-f37-stout text-2xl text-foreground">5</p>
            <p className="text-muted-foreground text-xs">2 expiring soon</p>
          </div>
        </div>
      </section>
    </div>
  );
}
