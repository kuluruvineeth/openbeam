"use client";

import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";

const USAGE_DATA = [
  { label: "Team Members", used: 24, limit: 50, unit: "seats" },
  { label: "Documents Indexed", used: 12_400, limit: 50_000, unit: "docs" },
  { label: "API Requests", used: 45_000, limit: 100_000, unit: "requests/mo" },
  { label: "Storage", used: 4.5, limit: 10, unit: "GB" },
];

export default function BillingPage() {
  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-1 font-f37-stout text-xl">Billing & Usage</h1>
        <p className="text-muted-foreground text-sm">
          Manage your subscription and view usage
        </p>
      </div>

      {/* Current Plan */}
      <section className="mb-8 border border-border bg-background p-6">
        <div className="flex items-start justify-between">
          <div>
            <span className="mb-2 inline-block bg-primary/10 px-2 py-0.5 text-primary text-xs">
              CURRENT PLAN
            </span>
            <h2 className="mb-1 font-f37-stout text-2xl">Team</h2>
            <p className="text-muted-foreground text-sm">
              Billed annually • Next billing date: Jan 15, 2025
            </p>
          </div>
          <div className="text-right">
            <p className="font-f37-stout text-3xl text-foreground">$99</p>
            <p className="text-muted-foreground text-sm">per user/month</p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="outline">Manage Subscription</Button>
          <Button>Upgrade Plan</Button>
        </div>
      </section>

      {/* Usage */}
      <section className="mb-8">
        <h2 className="mb-4 font-medium text-foreground">Usage This Month</h2>
        <div className="space-y-4">
          {USAGE_DATA.map((item) => {
            const percentage = (item.used / item.limit) * 100;
            const isNearLimit = percentage > 80;
            return (
              <div
                className="border border-border bg-background p-4"
                key={item.label}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium text-foreground text-sm">
                    {item.label}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {item.used.toLocaleString()} / {item.limit.toLocaleString()}{" "}
                    {item.unit}
                  </span>
                </div>
                <div className="h-2 bg-muted">
                  <div
                    className={`h-full transition-all ${
                      isNearLimit ? "bg-yellow-500" : "bg-primary"
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                {isNearLimit && (
                  <p className="mt-2 text-xs text-yellow-600">
                    Approaching limit - consider upgrading
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Payment Method */}
      <section className="mb-8">
        <h2 className="mb-4 font-medium text-foreground">Payment Method</h2>
        <div className="flex items-center justify-between border border-border bg-background p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-16 items-center justify-center bg-muted">
              <span className="font-mono text-sm">VISA</span>
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">
                •••• •••• •••• 4242
              </p>
              <p className="text-muted-foreground text-xs">Expires 12/25</p>
            </div>
          </div>
          <Button size="sm" variant="ghost">
            Update
          </Button>
        </div>
      </section>

      {/* Billing History */}
      <section>
        <h2 className="mb-4 font-medium text-foreground">Billing History</h2>
        <div className="border border-border bg-background">
          {[
            { date: "Dec 1, 2024", amount: "$2,376.00", status: "Paid" },
            { date: "Nov 1, 2024", amount: "$2,277.00", status: "Paid" },
            { date: "Oct 1, 2024", amount: "$2,178.00", status: "Paid" },
          ].map((invoice, i) => (
            <div
              className="flex items-center justify-between border-border border-b p-4 last:border-b-0"
              key={i}
            >
              <div>
                <p className="font-medium text-foreground text-sm">
                  {invoice.date}
                </p>
                <p className="text-muted-foreground text-xs">
                  Monthly subscription
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-foreground">{invoice.amount}</span>
                <span className="bg-green-500/10 px-2 py-0.5 text-green-500 text-xs">
                  {invoice.status}
                </span>
                <Button size="sm" variant="ghost">
                  <Icons.FileTextIcon size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
